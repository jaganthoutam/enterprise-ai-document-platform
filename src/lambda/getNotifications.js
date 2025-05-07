const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const params = {
    TableName: process.env.NOTIFICATIONS_TABLE,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId }
  };
  const result = await docClient.query(params).promise();
  return {
    statusCode: 200,
    body: JSON.stringify(result.Items)
  };
};
