const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
// const { BedrockClient } = require('bedrock-sdk'); // or OpenAI SDK

exports.handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const conversationId = event.pathParameters.id;
  const { message, context } = JSON.parse(event.body);
  const now = new Date().toISOString();

  // Store user message
  await docClient.put({
    TableName: process.env.MESSAGES_TABLE,
    Item: {
      PK: `CONV#${conversationId}`,
      SK: now,
      sender: 'user',
      text: message,
      timestamp: now
    }
  }).promise();

  // Call Bedrock/OpenAI (pseudo-code)
  // const aiResponse = await BedrockClient.chat({ message, context });
  const aiResponse = { text: 'AI response here', references: [] }; // Replace with real call

  // Store AI message
  await docClient.put({
    TableName: process.env.MESSAGES_TABLE,
    Item: {
      PK: `CONV#${conversationId}`,
      SK: new Date(Date.now() + 1).toISOString(),
      sender: 'ai',
      text: aiResponse.text,
      references: aiResponse.references,
      timestamp: new Date(Date.now() + 1).toISOString()
    }
  }).promise();

  // Update conversation lastMessage/updatedAt
  await docClient.update({
    TableName: process.env.CONVERSATIONS_TABLE,
    Key: { PK: `USER#${userId}`, SK: `CONV#${conversationId}` },
    UpdateExpression: 'set lastMessage = :msg, updatedAt = :now',
    ExpressionAttributeValues: { ':msg': aiResponse.text, ':now': now }
  }).promise();

  return {
    statusCode: 200,
    body: JSON.stringify({ message: aiResponse.text, references: aiResponse.references })
  };
};
