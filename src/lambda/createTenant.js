const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const tenant = JSON.parse(event.body);
  const tenantId = uuidv4();
  await docClient.put({
    TableName: process.env.TENANTS_TABLE,
    Item: { tenantId, ...tenant }
  }).promise();
  return {
    statusCode: 201,
    body: JSON.stringify({ tenantId, ...tenant })
  };
};
