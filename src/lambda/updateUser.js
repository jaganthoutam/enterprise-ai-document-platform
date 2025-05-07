const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const userId = event.pathParameters.id;
  const updates = JSON.parse(event.body);

  const updateExpr = [];
  const exprAttrValues = {};
  for (const [k, v] of Object.entries(updates)) {
    updateExpr.push(`${k} = :${k}`);
    exprAttrValues[`:${k}`] = v;
  }

  await docClient.update({
    TableName: process.env.USERS_TABLE,
    Key: { userId },
    UpdateExpression: `set ${updateExpr.join(', ')}`,
    ExpressionAttributeValues: exprAttrValues
  }).promise();

  return { statusCode: 204 };
};
