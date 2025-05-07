const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event) => {
  const { fileName, contentType } = JSON.parse(event.body);
  const userId = event.requestContext.authorizer.claims.sub;
  const key = `${userId}/${Date.now()}-${fileName}`;
  const params = {
    Bucket: process.env.DOCUMENTS_BUCKET,
    Key: key,
    ContentType: contentType,
    Expires: 300
  };
  const url = s3.getSignedUrl('putObject', params);
  return {
    statusCode: 200,
    body: JSON.stringify({ uploadUrl: url, key })
  };
};