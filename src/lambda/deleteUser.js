const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const userId = event.pathParameters.id;
  await docClient.delete({
    TableName: process.env.USERS_TABLE,
    Key: { userId }
  }).promise();
  return { statusCode: 204 };
};
