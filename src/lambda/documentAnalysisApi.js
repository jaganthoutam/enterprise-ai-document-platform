const { publishDocumentAnalysisNotification } = require('../utils/snsPublisher');

/**
 * Analyze a document
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
exports.analyzeDocument = async (event) => {
  try {
    const { fileName, contentType } = JSON.parse(event.body);
    
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
    
    // Get the current user ID from the request context
    const userId = event.requestContext.authorizer.claims.sub;
    
    // Create a document record
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const timestamp = new Date().toISOString();
    
    const document = {
      id,
      userId,
      fileName,
      contentType,
      originalName: fileName.split('-').slice(1).join('-'), // Remove the timestamp prefix
      status: 'processing',
      uploadedAt: timestamp
    };
    
    const params = {
      TableName: process.env.DOCUMENTS_TABLE,
      Item: document
    };
    
    await dynamoDB.put(params).promise();
    
    // Publish a notification that the document is being processed
    await publishDocumentAnalysisNotification(
      userId,
      document.originalName,
      'processing',
      'Your document is being analyzed. You will be notified when the analysis is complete.'
    );
    
    // Start the analysis process (this would typically be a separate Lambda function or Step Functions workflow)
    // For now, we'll simulate the analysis process with a setTimeout
    setTimeout(async () => {
      try {
        // Update the document status to completed
        const updateParams = {
          TableName: process.env.DOCUMENTS_TABLE,
          Key: { id },
          UpdateExpression: 'set #status = :status',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: {
            ':status': 'completed'
          }
        };
        
        await dynamoDB.update(updateParams).promise();
        
        // Publish a notification that the document analysis is complete
        await publishDocumentAnalysisNotification(
          userId,
          document.originalName,
          'completed',
          'Your document analysis is complete. Click to view the results.'
        );
      } catch (error) {
        console.error('Error updating document status:', error);
        
        // Update the document status to failed
        const updateParams = {
          TableName: process.env.DOCUMENTS_TABLE,
          Key: { id },
          UpdateExpression: 'set #status = :status',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: {
            ':status': 'failed'
          }
        };
        
        await dynamoDB.update(updateParams).promise();
        
        // Publish a notification that the document analysis failed
        await publishDocumentAnalysisNotification(
          userId,
          document.originalName,
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
        document
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