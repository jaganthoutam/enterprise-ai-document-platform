const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const params = {
    TableName: process.env.CONVERSATIONS_TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': `USER#${userId}` }
  };
  const result = await docClient.query(params).promise();
  return {
    statusCode: 200,
    body: JSON.stringify(result.Items.map(item => ({
      id: item.SK.replace('CONV#', ''),
      title: item.title,
      lastMessage: item.lastMessage,
      updatedAt: item.updatedAt
    })))
  };
};