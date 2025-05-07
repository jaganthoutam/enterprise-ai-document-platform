const AWS = require('aws-sdk');
const bedrock = new AWS.BedrockRuntime();
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const { documentId, analysisType } = JSON.parse(event.body);
        
        // Get document metadata from DynamoDB
        const document = await dynamoDB.get({
            TableName: process.env.DOCUMENTS_TABLE,
            Key: { documentId }
        }).promise();
        
        if (!document.Item) {
            throw new Error('Document not found');
        }
        
        // Get document content from S3
        const s3Object = await s3.getObject({
            Bucket: process.env.DOCUMENTS_BUCKET,
            Key: document.Item.s3Key
        }).promise();
        
        const documentContent = s3Object.Body.toString('utf-8');
        
        // Prepare prompt for Bedrock
        let prompt;
        switch (analysisType) {
            case 'summary':
                prompt = `Please provide a concise summary of the following document:\n\n${documentContent}`;
                break;
            case 'key_terms':
                prompt = `Extract and list the key terms and their definitions from the following document:\n\n${documentContent}`;
                break;
            case 'risk_assessment':
                prompt = `Analyze the following document for potential risks and provide a risk assessment:\n\n${documentContent}`;
                break;
            default:
                throw new Error('Invalid analysis type');
        }
        
        // Call Bedrock API
        const bedrockResponse = await bedrock.invokeModel({
            modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
                prompt,
                max_tokens: 1000,
                temperature: 0.7
            })
        }).promise();
        
        const analysisResult = JSON.parse(bedrockResponse.body.toString());
        
        // Update document metadata with analysis results
        await dynamoDB.update({
            TableName: process.env.DOCUMENTS_TABLE,
            Key: { documentId },
            UpdateExpression: 'SET analysisResults = :results, lastAnalyzed = :timestamp',
            ExpressionAttributeValues: {
                ':results': {
                    type: analysisType,
                    content: analysisResult.completion,
                    timestamp: new Date().toISOString()
                },
                ':timestamp': new Date().toISOString()
            }
        }).promise();
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify({
                documentId,
                analysisType,
                results: analysisResult.completion
            })
        };
    } catch (error) {
        console.error('Error in document analysis:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify({ error: error.message })
        };
    }
}; 