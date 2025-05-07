const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const result = await docClient.scan({ TableName: process.env.USERS_TABLE }).promise();
  return {
    statusCode: 200,
    body: JSON.stringify(result.Items)
  };
};
