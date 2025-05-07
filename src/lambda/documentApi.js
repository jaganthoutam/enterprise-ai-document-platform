const AWS = require('aws-sdk');
const { OpenSearchClient } = require('@opensearch-project/opensearch');
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { v4: uuidv4 } = require('uuid');

// Initialize AWS clients
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const secretsManager = new SecretsManagerClient();

// Initialize OpenSearch client
let opensearchClient;

// Environment variables
const DOCUMENTS_TABLE = process.env.DOCUMENTS_TABLE;
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

// Get documents for a user
async function getDocuments(userId, tenantId, limit = 20, lastEvaluatedKey = null) {
  const params = {
    TableName: DOCUMENTS_TABLE,
    IndexName: 'userId-tenantId-index',
    KeyConditionExpression: 'userId = :userId AND tenantId = :tenantId',
    ExpressionAttributeValues: {
      ':userId': userId,
      ':tenantId': tenantId
    },
    ScanIndexForward: false,
    Limit: limit
  };
  
  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = lastEvaluatedKey;
  }
  
  const result = await dynamoDB.query(params).promise();
  return {
    items: result.Items,
    lastEvaluatedKey: result.LastEvaluatedKey
  };
}

// Get a document by ID
async function getDocument(documentId) {
  const params = {
    TableName: DOCUMENTS_TABLE,
    Key: { documentId }
  };
  
  const result = await dynamoDB.get(params).promise();
  return result.Item;
}

// Create a document
async function createDocument(userId, tenantId, fileName, fileType, fileSize, s3Key) {
  const documentId = uuidv4();
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
      status: 'PENDING',
      createdAt: timestamp,
      updatedAt: timestamp
    }
  };
  
  await dynamoDB.put(params).promise();
  return params.Item;
}

// Delete a document
async function deleteDocument(documentId) {
  // Get document to find s3Key
  const document = await getDocument(documentId);
  
  if (!document) {
    throw new Error('Document not found');
  }
  
  // Delete from S3
  if (document.s3Key) {
    await s3.deleteObject({
      Bucket: BUCKET_NAME,
      Key: document.s3Key
    }).promise();
  }
  
  // Delete from DynamoDB
  const params = {
    TableName: DOCUMENTS_TABLE,
    Key: { documentId }
  };
  
  await dynamoDB.delete(params).promise();
  
  // Delete from OpenSearch
  try {
    const opensearch = await initOpenSearchClient();
    await opensearch.delete({
      index: 'documents',
      id: documentId
    });
  } catch (error) {
    console.warn('Error deleting from OpenSearch:', error);
  }
  
  return { documentId };
}

// Generate pre-signed URL for document upload
async function generatePresignedUrl(fileName, fileType) {
  const s3Key = `uploads/${uuidv4()}/${fileName}`;
  
  const params = {
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ContentType: fileType,
    Expires: 3600 // 1 hour
  };
  
  const url = await s3.getSignedUrlPromise('putObject', params);
  
  return {
    url,
    s3Key
  };
}

// Generate pre-signed URL for document download
async function generateDownloadUrl(s3Key, fileName) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ResponseContentDisposition: `attachment; filename="${fileName}"`,
    Expires: 3600 // 1 hour
  };
  
  const url = await s3.getSignedUrlPromise('getObject', params);
  
  return {
    url,
    fileName
  };
}

// Main handler function
exports.handler = async (event) => {
  try {
    console.log('Event:', JSON.stringify(event));
    
    // Get HTTP method and path
    const httpMethod = event.httpMethod;
    const path = event.path;
    const pathParameters = event.pathParameters || {};
    
    // Parse request body if present
    let body = {};
    if (event.body) {
      body = JSON.parse(event.body);
    }
    
    // Get user ID and tenant ID from request
    const userId = body.userId || (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims && event.requestContext.authorizer.claims.sub);
    const tenantId = body.tenantId || (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims && event.requestContext.authorizer.claims['custom:tenantId']);
    
    // Handle different HTTP methods and paths
    if (httpMethod === 'GET' && path === '/documents') {
      // Get documents
      const limit = parseInt(event.queryStringParameters?.limit || '20');
      const lastEvaluatedKey = event.queryStringParameters?.lastEvaluatedKey ? JSON.parse(decodeURIComponent(event.queryStringParameters.lastEvaluatedKey)) : null;
      
      const result = await getDocuments(userId, tenantId, limit, lastEvaluatedKey);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          items: result.items,
          lastEvaluatedKey: result.lastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.lastEvaluatedKey)) : null
        })
      };
    } else if (httpMethod === 'POST' && path === '/documents') {
      // Create document
      const { fileName, fileType, fileSize } = body;
      
      if (!fileName || !fileType || !fileSize) {
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
      
      // Generate pre-signed URL for upload
      const { url, s3Key } = await generatePresignedUrl(fileName, fileType);
      
      // Create document record
      const document = await createDocument(userId, tenantId, fileName, fileType, fileSize, s3Key);
      
      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Document created successfully',
          document,
          uploadUrl: url
        })
      };
    } else if (httpMethod === 'GET' && pathParameters.documentId) {
      // Get document by ID
      const documentId = pathParameters.documentId;
      const document = await getDocument(documentId);
      
      if (!document) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            message: 'Document not found'
          })
        };
      }
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(document)
      };
    } else if (httpMethod === 'DELETE' && pathParameters.documentId) {
      // Delete document
      const documentId = pathParameters.documentId;
      await deleteDocument(documentId);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Document deleted successfully',
          documentId
        })
      };
    } else if (httpMethod === 'GET' && pathParameters.documentId && path.endsWith('/download')) {
      // Download document
      const documentId = pathParameters.documentId;
      const document = await getDocument(documentId);
      
      if (!document) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            message: 'Document not found'
          })
        };
      }
      
      const { url, fileName } = await generateDownloadUrl(document.s3Key, document.fileName);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Download URL generated successfully',
          downloadUrl: url,
          fileName
        })
      };
    } else {
      // Method not allowed
      return {
        statusCode: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Method not allowed'
        })
      };
    }
  } catch (error) {
    console.error('Error:', error);
    
    // Return error response
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Error processing request',
        error: error.message
      })
    };
  }
}; 