const AWS = require('aws-sdk');
const { BedrockRuntime } = require('@aws-sdk/client-bedrock-runtime');
const { Textract } = require('@aws-sdk/client-textract');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { S3 } = require('@aws-sdk/client-s3');
const { Client } = require('@opensearch-project/opensearch');

const bedrock = new BedrockRuntime();
const textract = new Textract();
const dynamodb = new DynamoDB();
const s3 = new S3();

const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT;
const OPENSEARCH_INDEX = process.env.OPENSEARCH_INDEX || 'documents';
const DOCUMENTS_TABLE = process.env.DOCUMENTS_TABLE;
const client = new Client({ node: OPENSEARCH_ENDPOINT });

exports.handler = async (event) => {
  try {
    // S3 event
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    // Get document metadata from DynamoDB (assuming s3Key is unique)
    const docResult = await dynamodb.scan({
      TableName: DOCUMENTS_TABLE,
      FilterExpression: '#s3Key = :s3Key',
      ExpressionAttributeNames: { '#s3Key': 's3Key' },
      ExpressionAttributeValues: { ':s3Key': { S: key } },
    });
    if (!docResult.Items || docResult.Items.length === 0) throw new Error('Document metadata not found');
    const document = AWS.DynamoDB.Converter.unmarshall(docResult.Items[0]);

    // Get file from S3
    const s3Object = await s3.getObject({ Bucket: bucket, Key: key });
    let textContent;
    if (document.fileType === 'application/pdf') {
      // Use Textract for PDF
      const textractResponse = await textract.startDocumentTextDetection({
        DocumentLocation: { S3Object: { Bucket: bucket, Name: key } },
      });
      const jobId = textractResponse.JobId;
      let jobComplete = false;
      let textractResult;
      while (!jobComplete) {
        const result = await textract.getDocumentTextDetection({ JobId: jobId });
        if (result.JobStatus === 'SUCCEEDED') {
          jobComplete = true;
          textractResult = result;
        } else if (result.JobStatus === 'FAILED') {
          throw new Error('Textract job failed');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      textContent = textractResult.Blocks.filter(b => b.BlockType === 'LINE').map(b => b.Text).join('\n');
    } else {
      // For text files, read directly
      textContent = (await s3Object.Body.transformToString()).toString();
    }

    // Generate embedding with Bedrock
    const embeddingResponse = await bedrock.invokeModel({
      modelId: 'amazon.titan-embed-text-v1',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({ inputText: textContent }),
    });
    const embedding = JSON.parse(embeddingResponse.body.toString()).embedding;

    // Index in OpenSearch
    await client.index({
      index: OPENSEARCH_INDEX,
      id: document.id,
      body: {
        id: document.id,
        userId: document.userId,
        title: document.title,
        description: document.description,
        tags: document.tags,
        text: textContent,
        embedding,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
    });

    // Optionally update DynamoDB with embedding info
    await dynamodb.updateItem({
      TableName: DOCUMENTS_TABLE,
      Key: { id: { S: document.id } },
      UpdateExpression: 'SET #embedding = :embedding',
      ExpressionAttributeNames: { '#embedding': 'embedding' },
      ExpressionAttributeValues: { ':embedding': { S: JSON.stringify(embedding) } },
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error('Error in ETL/embedding Lambda:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}; 