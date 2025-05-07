const AWS = require('aws-sdk');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { v4: uuidv4 } = require('uuid');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const TENANTS_TABLE = process.env.TENANTS_TABLE;
const SECRETS_ARN = process.env.SECRETS_ARN;

// Get secrets from Secrets Manager
async function getSecrets() {
  const command = new GetSecretValueCommand({
    SecretId: SECRETS_ARN
  });
  
  const response = await secretsManager.send(command);
  return JSON.parse(response.SecretString);
}

// Get all tenants
async function getTenants(limit = 20, lastEvaluatedKey = null) {
  const params = {
    TableName: TENANTS_TABLE,
    ScanIndexForward: false,
    Limit: limit
  };
  
  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = lastEvaluatedKey;
  }
  
  const result = await dynamoDB.scan(params).promise();
  return {
    items: result.Items,
    lastEvaluatedKey: result.LastEvaluatedKey
  };
}

// Get a tenant by ID
async function getTenant(tenantId) {
  const params = {
    TableName: TENANTS_TABLE,
    Key: { tenantId }
  };
  
  const result = await dynamoDB.get(params).promise();
  return result.Item;
}

// Create a tenant
async function createTenant(name, description, plan = 'basic', status = 'ACTIVE') {
  const tenantId = uuidv4();
  const timestamp = new Date().toISOString();
  
  const params = {
    TableName: TENANTS_TABLE,
    Item: {
      tenantId,
      name,
      description,
      plan,
      status,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  };
  
  await dynamoDB.put(params).promise();
  return params.Item;
}

// Update a tenant
async function updateTenant(tenantId, updates) {
  // Get current tenant
  const currentTenant = await getTenant(tenantId);
  
  if (!currentTenant) {
    throw new Error('Tenant not found');
  }
  
  // Prepare update expression and attribute values
  let updateExpression = 'SET updatedAt = :updatedAt';
  const expressionAttributeValues = {
    ':updatedAt': new Date().toISOString()
  };
  
  // Add fields to update
  if (updates.name) {
    updateExpression += ', name = :name';
    expressionAttributeValues[':name'] = updates.name;
  }
  
  if (updates.description) {
    updateExpression += ', description = :description';
    expressionAttributeValues[':description'] = updates.description;
  }
  
  if (updates.plan) {
    updateExpression += ', plan = :plan';
    expressionAttributeValues[':plan'] = updates.plan;
  }
  
  if (updates.status) {
    updateExpression += ', status = :status';
    expressionAttributeValues[':status'] = updates.status;
  }
  
  const params = {
    TableName: TENANTS_TABLE,
    Key: { tenantId },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  };
  
  const result = await dynamoDB.update(params).promise();
  return result.Attributes;
}

// Delete a tenant
async function deleteTenant(tenantId) {
  // Check if tenant exists
  const tenant = await getTenant(tenantId);
  
  if (!tenant) {
    throw new Error('Tenant not found');
  }
  
  const params = {
    TableName: TENANTS_TABLE,
    Key: { tenantId }
  };
  
  await dynamoDB.delete(params).promise();
  
  return { tenantId };
}

// Main handler function
exports.handler = async (event) => {
  try {
    console.log('Event:', JSON.stringify(event));
    
    // Get HTTP method and path
    const httpMethod = event.httpMethod;
    const path = event.path;
    const pathParameters = event.pathParameters || {};
    
    // Parse request body if present
    let body = {};
    if (event.body) {
      body = JSON.parse(event.body);
    }
    
    // Handle different HTTP methods and paths
    if (httpMethod === 'GET' && path === '/tenants') {
      // Get tenants
      const limit = parseInt(event.queryStringParameters?.limit || '20');
      const lastEvaluatedKey = event.queryStringParameters?.lastEvaluatedKey ? JSON.parse(decodeURIComponent(event.queryStringParameters.lastEvaluatedKey)) : null;
      
      const result = await getTenants(limit, lastEvaluatedKey);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          items: result.items,
          lastEvaluatedKey: result.lastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.lastEvaluatedKey)) : null
        })
      };
    } else if (httpMethod === 'POST' && path === '/tenants') {
      // Create tenant
      const { name, description, plan, status } = body;
      
      if (!name) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            message: 'Missing required fields'
          })
        };
      }
      
      const tenant = await createTenant(name, description, plan, status);
      
      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Tenant created successfully',
          tenant
        })
      };
    } else if (httpMethod === 'GET' && pathParameters.tenantId) {
      // Get tenant by ID
      const tenantId = pathParameters.tenantId;
      const tenant = await getTenant(tenantId);
      
      if (!tenant) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            message: 'Tenant not found'
          })
        };
      }
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(tenant)
      };
    } else if (httpMethod === 'PUT' && pathParameters.tenantId) {
      // Update tenant
      const tenantId = pathParameters.tenantId;
      const updates = body;
      
      const tenant = await updateTenant(tenantId, updates);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Tenant updated successfully',
          tenant
        })
      };
    } else if (httpMethod === 'DELETE' && pathParameters.tenantId) {
      // Delete tenant
      const tenantId = pathParameters.tenantId;
      await deleteTenant(tenantId);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Tenant deleted successfully',
          tenantId
        })
      };
    } else {
      // Method not allowed
      return {
        statusCode: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Method not allowed'
        })
      };
    }
  } catch (error) {
    console.error('Error:', error);
    
    // Return error response
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Error processing request',
        error: error.message
      })
    };
  }
}; 