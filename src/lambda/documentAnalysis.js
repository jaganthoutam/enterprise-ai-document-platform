const AWS = require('aws-sdk');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { TextractClient, StartDocumentAnalysisCommand, GetDocumentAnalysisCommand } = require('@aws-sdk/client-textract');
const { OpenSearchClient } = require('@opensearch-project/opensearch');
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

// Initialize AWS clients
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const textract = new TextractClient();
const bedrock = new BedrockRuntimeClient();
const secretsManager = new SecretsManagerClient();

// Initialize OpenSearch client
let opensearchClient;

// Environment variables
const DOCUMENTS_TABLE = process.env.DOCUMENTS_TABLE;
const ANALYSIS_TABLE = process.env.ANALYSIS_TABLE;
const BUCKET_NAME = process.env.BUCKET_NAME;
const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT;
const SECRETS_ARN = process.env.SECRETS_ARN;

// Initialize OpenSearch client with AWS credentials
async function initOpenSearchClient() {
  if (!opensearchClient) {
    const credentials = AWS.config.credentials;
    const signer = new AwsSigv4Signer({
      region: AWS.config.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken
      }
    });
    
    opensearchClient = new OpenSearchClient({
      ...signer.getClient(),
      node: `https://${OPENSEARCH_ENDPOINT}`
    });
  }
  return opensearchClient;
}

// Get secrets from Secrets Manager
async function getSecrets() {
  const command = new GetSecretValueCommand({
    SecretId: SECRETS_ARN
  });
  
  const response = await secretsManager.send(command);
  return JSON.parse(response.SecretString);
}

// Generate embeddings using Bedrock
async function generateEmbeddings(text) {
  const modelId = 'amazon.titan-embed-text-v1';
  
  const input = {
    inputText: text
  };
  
  const command = new InvokeModelCommand({
    modelId,
    body: JSON.stringify(input)
  });
  
  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  return responseBody.embedding;
}

// Process document with Textract
async function processDocumentWithTextract(bucket, key) {
  const startCommand = new StartDocumentAnalysisCommand({
    DocumentLocation: {
      S3Object: {
        Bucket: bucket,
        Name: key
      }
    },
    FeatureTypes: ['TABLES', 'FORMS']
  });
  
  const startResponse = await textract.send(startCommand);
  const jobId = startResponse.JobId;
  
  // Poll for completion
  let analysisComplete = false;
  let analysisResult = null;
  
  while (!analysisComplete) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between polls
    
    const getCommand = new GetDocumentAnalysisCommand({
      JobId: jobId
    });
    
    const getResponse = await textract.send(getCommand);
    
    if (getResponse.JobStatus === 'SUCCEEDED') {
      analysisComplete = true;
      analysisResult = getResponse;
    } else if (getResponse.JobStatus === 'FAILED') {
      throw new Error(`Textract job failed: ${getResponse.StatusMessage}`);
    }
  }
  
  return analysisResult;
}

// Extract text from Textract blocks
function extractTextFromBlocks(blocks) {
  let text = '';
  
  for (const block of blocks) {
    if (block.BlockType === 'LINE') {
      text += block.Text + ' ';
    }
  }
  
  return text.trim();
}

// Store document in DynamoDB
async function storeDocument(documentId, userId, tenantId, fileName, fileType, fileSize, s3Key) {
  const timestamp = new Date().toISOString();
  
  const params = {
    TableName: DOCUMENTS_TABLE,
    Item: {
      documentId,
      userId,
      tenantId,
      fileName,
      fileType,
      fileSize,
      s3Key,
      status: 'PROCESSING',
      createdAt: timestamp,
      updatedAt: timestamp
    }
  };
  
  await dynamoDB.put(params).promise();
  return params.Item;
}

// Store analysis in DynamoDB
async function storeAnalysis(documentId, analysisId, analysisType, content, metadata) {
  const timestamp = new Date().toISOString();
  
  const params = {
    TableName: ANALYSIS_TABLE,
    Item: {
      analysisId,
      documentId,
      analysisType,
      content,
      metadata,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  };
  
  await dynamoDB.put(params).promise();
  return params.Item;
}

// Index document in OpenSearch
async function indexDocument(documentId, text, metadata) {
  const opensearch = await initOpenSearchClient();
  
  // Generate embeddings
  const embedding = await generateEmbeddings(text);
  
  const document = {
    documentId,
    text,
    embedding,
    ...metadata
  };
  
  const response = await opensearch.index({
    index: 'documents',
    id: documentId,
    body: document
  });
  
  return response;
}

// Main handler function
exports.handler = async (event) => {
  try {
    console.log('Event:', JSON.stringify(event));
    
    // Parse request body
    const body = JSON.parse(event.body);
    const { documentId, userId, tenantId, fileName, fileType, fileSize, s3Key } = body;
    
    // Validate required fields
    if (!documentId || !userId || !tenantId || !fileName || !s3Key) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Missing required fields'
        })
      };
    }
    
    // Store document in DynamoDB
    const document = await storeDocument(
      documentId,
      userId,
      tenantId,
      fileName,
      fileType,
      fileSize,
      s3Key
    );
    
    // Process document with Textract
    const textractResult = await processDocumentWithTextract(BUCKET_NAME, s3Key);
    
    // Extract text from blocks
    const extractedText = extractTextFromBlocks(textractResult.Blocks);
    
    // Store analysis in DynamoDB
    const analysisId = `${documentId}-textract`;
    const analysis = await storeAnalysis(
      documentId,
      analysisId,
      'TEXTRACT',
      extractedText,
      {
        blocks: textractResult.Blocks,
        documentMetadata: textractResult.DocumentMetadata
      }
    );
    
    // Index document in OpenSearch
    await indexDocument(documentId, extractedText, {
      userId,
      tenantId,
      fileName,
      fileType,
      fileSize,
      analysisId
    });
    
    // Update document status
    await dynamoDB.update({
      TableName: DOCUMENTS_TABLE,
      Key: { documentId },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'COMPLETED',
        ':updatedAt': new Date().toISOString()
      }
    }).promise();
    
    // Return success response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Document analysis completed successfully',
        documentId,
        analysisId
      })
    };
  } catch (error) {
    console.error('Error:', error);
    
    // Update document status to ERROR if documentId is available
    if (event.body) {
      try {
        const body = JSON.parse(event.body);
        if (body.documentId) {
          await dynamoDB.update({
            TableName: DOCUMENTS_TABLE,
            Key: { documentId: body.documentId },
            UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
            ExpressionAttributeNames: {
              '#status': 'status'
            },
            ExpressionAttributeValues: {
              ':status': 'ERROR',
              ':updatedAt': new Date().toISOString()
            }
          }).promise();
        }
      } catch (updateError) {
        console.error('Error updating document status:', updateError);
      }
    }
    
    // Return error response
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Error processing document',
        error: error.message
      })
    };
  }
}; 