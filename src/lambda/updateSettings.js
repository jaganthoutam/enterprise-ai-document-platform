const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const settings = JSON.parse(event.body);

  await docClient.put({
    TableName: process.env.SETTINGS_TABLE,
    Item: { userId, ...settings }
  }).promise();

  return { statusCode: 204 };
};
