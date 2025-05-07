const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const { httpMethod } = event;
        const { tenantId } = event.pathParameters || {};
        
        switch (httpMethod) {
            case 'POST':
                return await createTenant(JSON.parse(event.body));
            case 'GET':
                if (tenantId) {
                    return await getTenant(tenantId);
                }
                return await listTenants();
            case 'PUT':
                return await updateTenant(tenantId, JSON.parse(event.body));
            case 'DELETE':
                return await deleteTenant(tenantId);
            default:
                throw new Error(`Unsupported method: ${httpMethod}`);
        }
    } catch (error) {
        console.error('Error in tenant management:', error);
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

async function createTenant(tenantData) {
    const tenantId = uuidv4();
    const newTenant = {
        tenantId,
        ...tenantData,
        createdAt: new Date().toISOString(),
        status: 'active',
        storageQuota: 5368709120, // 5GB in bytes
        aiUsageQuota: 1000, // 1000 AI operations per month
        currentStorage: 0,
        currentAiUsage: 0
    };
    
    await dynamoDB.put({
        TableName: process.env.TENANTS_TABLE,
        Item: newTenant
    }).promise();
    
    return {
        statusCode: 201,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify(newTenant)
    };
}

async function getTenant(tenantId) {
    const result = await dynamoDB.get({
        TableName: process.env.TENANTS_TABLE,
        Key: { tenantId }
    }).promise();
    
    if (!result.Item) {
        return {
            statusCode: 404,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify({ error: 'Tenant not found' })
        };
    }
    
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify(result.Item)
    };
}

async function listTenants() {
    const result = await dynamoDB.scan({
        TableName: process.env.TENANTS_TABLE
    }).promise();
    
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify(result.Items)
    };
}

async function updateTenant(tenantId, updateData) {
    const updateExpression = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};
    
    Object.entries(updateData).forEach(([key, value]) => {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeValues[`:${key}`] = value;
        expressionAttributeNames[`#${key}`] = key;
    });
    
    const result = await dynamoDB.update({
        TableName: process.env.TENANTS_TABLE,
        Key: { tenantId },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        ReturnValues: 'ALL_NEW'
    }).promise();
    
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify(result.Attributes)
    };
}

async function deleteTenant(tenantId) {
    await dynamoDB.delete({
        TableName: process.env.TENANTS_TABLE,
        Key: { tenantId }
    }).promise();
    
    return {
        statusCode: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true
        }
    };
} 