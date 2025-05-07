const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const conversationId = event.pathParameters.id;

  // Delete conversation item
  await docClient.delete({
    TableName: process.env.CONVERSATIONS_TABLE,
    Key: { PK: `USER#${userId}`, SK: `CONV#${conversationId}` }
  }).promise();

  // Delete all messages for this conversation
  const messages = await docClient.query({
    TableName: process.env.MESSAGES_TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': `CONV#${conversationId}` }
  }).promise();

  for (const msg of messages.Items) {
    await docClient.delete({
      TableName: process.env.MESSAGES_TABLE,
      Key: { PK: msg.PK, SK: msg.SK }
    }).promise();
  }

  return { statusCode: 204 };
};
