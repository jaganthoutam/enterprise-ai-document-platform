import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, UpdateItemCommand, DeleteItemCommand, AttributeValue } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const dynamoDB = new DynamoDBClient({});
const s3 = new S3Client({});

interface Document {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  size: number;
  url?: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { path, httpMethod, pathParameters, queryStringParameters } = event;
    const body = event.body ? JSON.parse(event.body) : {};

    // Extract tenant ID from the authenticated user's token
    const tenantId = event.requestContext.authorizer?.claims['custom:tenant_id'];

    if (!tenantId) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: 'Unauthorized' }),
      };
    }

    if (path === '/documents' && httpMethod === 'GET') {
      return await listDocuments(tenantId, queryStringParameters);
    }

    if (path === '/documents' && httpMethod === 'POST') {
      return await createDocument(tenantId, body);
    }

    if (path.startsWith('/documents/') && httpMethod === 'GET') {
      const documentId = pathParameters?.documentId;
      if (!documentId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Document ID is required' }),
        };
      }
      return await getDocument(tenantId, documentId);
    }

    if (path.startsWith('/documents/') && httpMethod === 'PUT') {
      const documentId = pathParameters?.documentId;
      if (!documentId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Document ID is required' }),
        };
      }
      return await updateDocument(tenantId, documentId, body);
    }

    if (path.startsWith('/documents/') && httpMethod === 'DELETE') {
      const documentId = pathParameters?.documentId;
      if (!documentId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Document ID is required' }),
        };
      }
      return await deleteDocument(tenantId, documentId);
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ message: 'Not found' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

async function listDocuments(tenantId: string, queryParams: any): Promise<APIGatewayProxyResult> {
  try {
    const { status, limit = 10, lastEvaluatedKey } = queryParams;

    const params: any = {
      TableName: process.env.DOCUMENTS_TABLE,
      IndexName: 'TenantStatusIndex',
      KeyConditionExpression: 'tenantId = :tenantId',
      ExpressionAttributeValues: marshall({
        ':tenantId': tenantId,
      }),
      ExpressionAttributeNames: {},
      Limit: parseInt(limit),
    };

    if (status) {
      params.KeyConditionExpression += ' AND #status = :status';
      params.ExpressionAttributeNames = {
        '#status': 'status',
      };
      params.ExpressionAttributeValues = marshall({
        ...unmarshall(params.ExpressionAttributeValues),
        ':status': status,
      });
    }

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = JSON.parse(lastEvaluatedKey);
    }

    const result = await dynamoDB.send(new QueryCommand(params));

    return {
      statusCode: 200,
      body: JSON.stringify({
        items: result.Items?.map(item => unmarshall(item)),
        lastEvaluatedKey: result.LastEvaluatedKey,
      }),
    };
  } catch (error) {
    console.error('List documents error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to list documents' }),
    };
  }
}

async function createDocument(tenantId: string, document: Partial<Document>): Promise<APIGatewayProxyResult> {
  try {
    const documentId = randomUUID();
    const now = new Date().toISOString();

    const newDocument: Document = {
      id: documentId,
      tenantId,
      name: document.name || '',
      type: document.type || '',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      size: document.size || 0,
    };

    await dynamoDB.send(
      new PutItemCommand({
        TableName: process.env.DOCUMENTS_TABLE,
        Item: marshall(newDocument),
      })
    );

    // Generate pre-signed URL for upload
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: process.env.DOCUMENTS_BUCKET,
        Key: `${tenantId}/${documentId}`,
      }),
      { expiresIn: 3600 }
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        ...newDocument,
        uploadUrl,
      }),
    };
  } catch (error) {
    console.error('Create document error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to create document' }),
    };
  }
}

async function getDocument(tenantId: string, documentId: string): Promise<APIGatewayProxyResult> {
  try {
    const result = await dynamoDB.send(
      new GetItemCommand({
        TableName: process.env.DOCUMENTS_TABLE,
        Key: marshall({
          id: documentId,
          tenantId,
        }),
      })
    );

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Document not found' }),
      };
    }

    const document = unmarshall(result.Item);

    // Generate pre-signed URL for download
    const downloadUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: process.env.DOCUMENTS_BUCKET,
        Key: `${tenantId}/${documentId}`,
      }),
      { expiresIn: 3600 }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        ...document,
        downloadUrl,
      }),
    };
  } catch (error) {
    console.error('Get document error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to get document' }),
    };
  }
}

async function updateDocument(tenantId: string, documentId: string, updates: Partial<Document>): Promise<APIGatewayProxyResult> {
  try {
    const now = new Date().toISOString();

    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'tenantId') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });

    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;

    const result = await dynamoDB.send(
      new UpdateItemCommand({
        TableName: process.env.DOCUMENTS_TABLE,
        Key: marshall({
          id: documentId,
          tenantId,
        }),
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ReturnValues: 'ALL_NEW',
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify(unmarshall(result.Attributes || {})),
    };
  } catch (error) {
    console.error('Update document error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to update document' }),
    };
  }
}

async function deleteDocument(tenantId: string, documentId: string): Promise<APIGatewayProxyResult> {
  try {
    // Delete from DynamoDB
    await dynamoDB.send(
      new DeleteItemCommand({
        TableName: process.env.DOCUMENTS_TABLE,
        Key: marshall({
          id: documentId,
          tenantId,
        }),
      })
    );

    // Delete from S3
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.DOCUMENTS_BUCKET,
        Key: `${tenantId}/${documentId}`,
      })
    );

    return {
      statusCode: 204,
      body: '',
    };
  } catch (error) {
    console.error('Delete document error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to delete document' }),
    };
  }
} 