const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const { notificationId } = JSON.parse(event.body);

  await docClient.update({
    TableName: process.env.NOTIFICATIONS_TABLE,
    Key: { userId, notificationId },
    UpdateExpression: 'set read = :r',
    ExpressionAttributeValues: { ':r': true }
  }).promise();

  return { statusCode: 204 };
};
