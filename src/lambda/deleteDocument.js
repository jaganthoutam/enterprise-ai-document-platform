const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { documentId, key } = JSON.parse(event.body);

  // Delete from S3
  await s3.deleteObject({
    Bucket: process.env.DOCUMENTS_BUCKET,
    Key: key
  }).promise();

  // Delete from DynamoDB
  await docClient.delete({
    TableName: process.env.DOCUMENTS_TABLE,
    Key: { documentId }
  }).promise();

  return { statusCode: 204 };
};
