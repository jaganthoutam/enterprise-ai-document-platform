const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const documentId = event.pathParameters.id;
  const result = await docClient.get({
    TableName: process.env.DOCUMENTS_TABLE,
    Key: { documentId }
  }).promise();
  return {
    statusCode: 200,
    body: JSON.stringify(result.Item || {})
  };
};
