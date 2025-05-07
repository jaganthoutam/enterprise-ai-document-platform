const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const user = JSON.parse(event.body);
  const userId = uuidv4();
  await docClient.put({
    TableName: process.env.USERS_TABLE,
    Item: { userId, ...user }
  }).promise();
  return {
    statusCode: 201,
    body: JSON.stringify({ userId, ...user })
  };
};
