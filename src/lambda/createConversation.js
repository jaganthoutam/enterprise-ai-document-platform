const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const { title } = JSON.parse(event.body);
  const conversationId = uuidv4();
  const now = new Date().toISOString();
  const item = {
    PK: `USER#${userId}`,
    SK: `CONV#${conversationId}`,
    title,
    createdAt: now,
    updatedAt: now
  };
  await docClient.put({ TableName: process.env.CONVERSATIONS_TABLE, Item: item }).promise();
  return {
    statusCode: 200,
    body: JSON.stringify({ id: conversationId, title, createdAt: now, updatedAt: now })
  };
};