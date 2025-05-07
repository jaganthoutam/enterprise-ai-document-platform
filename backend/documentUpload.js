const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const { tenantId, userId, fileName, fileType, fileSize } = JSON.parse(event.body);
        const documentId = uuidv4();
        
        // Generate pre-signed URL for S3 upload
        const s3Params = {
            Bucket: process.env.DOCUMENTS_BUCKET,
            Key: `${tenantId}/${documentId}/${fileName}`,
            ContentType: fileType,
            Expires: 3600 // URL expires in 1 hour
        };
        
        const uploadUrl = await s3.getSignedUrlPromise('putObject', s3Params);
        
        // Store document metadata in DynamoDB
        const documentMetadata = {
            documentId,
            tenantId,
            userId,
            fileName,
            fileType,
            fileSize,
            uploadDate: new Date().toISOString(),
            status: 'pending',
            s3Key: s3Params.Key
        };
        
        await dynamoDB.put({
            TableName: process.env.DOCUMENTS_TABLE,
            Item: documentMetadata
        }).promise();
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify({
                uploadUrl,
                documentId,
                ...documentMetadata
            })
        };
    } catch (error) {
        console.error('Error in document upload:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify({ error: error.message })
        };
    }
}; 