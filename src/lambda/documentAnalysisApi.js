const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { publishDocumentAnalysisNotification } = require('../utils/snsPublisher');

// Get all documents for analysis
exports.getDocuments = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    const params = {
      TableName: process.env.DOCUMENTS_TABLE,
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    };
    
    const result = await dynamoDB.scan(params).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(result.Items)
    };
  } catch (error) {
    console.error('Error getting documents:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: 'Error getting documents',
        error: error.message
      })
    };
  }
};

// Upload a document
exports.uploadDocument = async (event) => {
  try {
    const { fileName, contentType } = JSON.parse(event.body);
    const userId = event.requestContext.authorizer.claims.sub;
    
    if (!fileName || !contentType) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
          message: 'Missing required fields: fileName and contentType are required'
        })
      };
    }
    
    // Generate a pre-signed URL for upload
    const s3 = new AWS.S3();
    const s3Key = `uploads/${userId}/${Date.now()}-${fileName}`;
    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
      Expires: 3600 // 1 hour
    };
    
    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        uploadUrl,
        s3Key
      })
    };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: 'Error generating upload URL',
        error: error.message
      })
    };
  }
};

// Analyze a document
exports.analyzeDocument = async (event) => {
  try {
    const { documentId } = event.pathParameters;
    const userId = event.requestContext.authorizer.claims.sub;
    
    // Get document details
    const params = {
      TableName: process.env.DOCUMENTS_TABLE,
      Key: { documentId }
    };
    
    const result = await dynamoDB.get(params).promise();
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
          message: 'Document not found'
        })
      };
    }
    
    // Update document status to processing
    const updateParams = {
      TableName: process.env.DOCUMENTS_TABLE,
      Key: { documentId },
      UpdateExpression: 'set #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'processing'
      }
    };
    
    await dynamoDB.update(updateParams).promise();
    
    // Publish notification
    await publishDocumentAnalysisNotification(
      userId,
      result.Item.fileName,
      'processing',
      'Your document is being analyzed. You will be notified when the analysis is complete.'
    );
    
    // Start analysis process (this would typically be a separate Lambda function or Step Functions workflow)
    // For now, we'll simulate the analysis process
    setTimeout(async () => {
      try {
        // Update document status to completed
        const completeParams = {
          TableName: process.env.DOCUMENTS_TABLE,
          Key: { documentId },
          UpdateExpression: 'set #status = :status',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: {
            ':status': 'completed'
          }
        };
        
        await dynamoDB.update(completeParams).promise();
        
        // Publish completion notification
        await publishDocumentAnalysisNotification(
          userId,
          result.Item.fileName,
          'completed',
          'Your document analysis is complete. Click to view the results.'
        );
      } catch (error) {
        console.error('Error updating document status:', error);
        
        // Update document status to failed
        const failParams = {
          TableName: process.env.DOCUMENTS_TABLE,
          Key: { documentId },
          UpdateExpression: 'set #status = :status',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: {
            ':status': 'failed'
          }
        };
        
        await dynamoDB.update(failParams).promise();
        
        // Publish failure notification
        await publishDocumentAnalysisNotification(
          userId,
          result.Item.fileName,
          'failed',
          'Your document analysis failed. Please try again or contact support.'
        );
      }
    }, 30000); // Simulate a 30-second analysis process
    
    return {
      statusCode: 202,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: 'Document analysis started',
        documentId
      })
    };
  } catch (error) {
    console.error('Error analyzing document:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: 'Error analyzing document',
        error: error.message
      })
    };
  }
};

// Get document analysis results
exports.getDocumentAnalysis = async (event) => {
  try {
    const { documentId } = event.pathParameters;
    const userId = event.requestContext.authorizer.claims.sub;
    
    // Get document details
    const params = {
      TableName: process.env.DOCUMENTS_TABLE,
      Key: { documentId }
    };
    
    const result = await dynamoDB.get(params).promise();
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
          message: 'Document not found'
        })
      };
    }
    
    // Get analysis results (this would typically come from a separate table or service)
    const analysisParams = {
      TableName: process.env.ANALYSIS_TABLE,
      Key: { documentId }
    };
    
    const analysisResult = await dynamoDB.get(analysisParams).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        document: result.Item,
        analysis: analysisResult.Item
      })
    };
  } catch (error) {
    console.error('Error getting document analysis:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: 'Error getting document analysis',
        error: error.message
      })
    };
  }
};

// Main handler function
exports.handler = async (event) => {
  try {
    console.log('Event:', JSON.stringify(event));
    
    // Get HTTP method and path
    const httpMethod = event.httpMethod;
    const path = event.path;
    const pathParameters = event.pathParameters || {};
    
    // Route the request to the appropriate function
    if (path === '/documents/analysis' && httpMethod === 'GET') {
      return await exports.getDocuments(event);
    } else if (path === '/documents/analysis/upload' && httpMethod === 'POST') {
      return await exports.uploadDocument(event);
    } else if (path === '/documents/analysis/analyze' && httpMethod === 'POST') {
      return await exports.analyzeDocument(event);
    } else if (path.match(/\/documents\/analysis\/.*$/) && httpMethod === 'GET') {
      return await exports.getDocumentAnalysis(event);
    }
    
    // If no route matches, return 404
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: 'Not Found'
      })
    };
  } catch (error) {
    console.error('Error in handler:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: 'Internal Server Error',
        error: error.message
      })
    };
  }
}; 