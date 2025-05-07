const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const conversationId = event.pathParameters.id;
  const { title } = JSON.parse(event.body);

  await docClient.update({
    TableName: process.env.CONVERSATIONS_TABLE,
    Key: { PK: `USER#${userId}`, SK: `CONV#${conversationId}` },
    UpdateExpression: 'set title = :title, updatedAt = :now',
    ExpressionAttributeValues: { ':title': title, ':now': new Date().toISOString() }
  }).promise();

  return { statusCode: 204 };
};
