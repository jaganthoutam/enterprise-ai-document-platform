const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const conversationId = event.pathParameters.id;
  const params = {
    TableName: process.env.MESSAGES_TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': `CONV#${conversationId}` }
  };
  const result = await docClient.query(params).promise();
  return {
    statusCode: 200,
    body: JSON.stringify({ messages: result.Items })
  };
};
