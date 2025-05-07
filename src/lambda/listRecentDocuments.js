const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  // Example: scan last 10 documents for the user
  const userId = event.requestContext.authorizer.claims.sub;
  const params = {
    TableName: process.env.DOCUMENTS_TABLE,
    IndexName: 'UserUploadDateIndex',
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
    ScanIndexForward: false,
    Limit: 10
  };
  const result = await docClient.query(params).promise();
  return {
    statusCode: 200,
    body: JSON.stringify(result.Items)
  };
};