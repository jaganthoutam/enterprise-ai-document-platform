const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const notifications = await docClient.query({
    TableName: process.env.NOTIFICATIONS_TABLE,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId }
  }).promise();

  for (const notif of notifications.Items) {
    await docClient.delete({
      TableName: process.env.NOTIFICATIONS_TABLE,
      Key: { userId, notificationId: notif.notificationId }
    }).promise();
  }

  return { statusCode: 204 };
};
