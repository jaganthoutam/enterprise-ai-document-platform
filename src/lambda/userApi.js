const AWS = require('aws-sdk');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// Initialize AWS clients
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const secretsManager = new SecretsManagerClient();

// Environment variables
const USERS_TABLE = process.env.USERS_TABLE;
const SECRETS_ARN = process.env.SECRETS_ARN;

// Get secrets from Secrets Manager
async function getSecrets() {
  const command = new GetSecretValueCommand({
    SecretId: SECRETS_ARN
  });
  
  const response = await secretsManager.send(command);
  return JSON.parse(response.SecretString);
}

// Get users for a tenant
async function getUsers(tenantId, limit = 20, lastEvaluatedKey = null) {
  const params = {
    TableName: USERS_TABLE,
    IndexName: 'tenantId-index',
    KeyConditionExpression: 'tenantId = :tenantId',
    ExpressionAttributeValues: {
      ':tenantId': tenantId
    },
    ScanIndexForward: false,
    Limit: limit
  };
  
  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = lastEvaluatedKey;
  }
  
  const result = await dynamoDB.query(params).promise();
  return {
    items: result.Items.map(user => {
      // Remove sensitive information
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }),
    lastEvaluatedKey: result.LastEvaluatedKey
  };
}

// Get a user by ID
async function getUser(userId) {
  const params = {
    TableName: USERS_TABLE,
    Key: { userId }
  };
  
  const result = await dynamoDB.get(params).promise();
  
  if (result.Item) {
    // Remove sensitive information
    const { password, ...userWithoutPassword } = result.Item;
    return userWithoutPassword;
  }
  
  return null;
}

// Create a user
async function createUser(tenantId, email, password, firstName, lastName, role = 'user') {
  // Check if user already exists
  const existingUser = await getUserByEmail(email);
  
  if (existingUser) {
    throw new Error('User with this email already exists');
  }
  
  const userId = uuidv4();
  const timestamp = new Date().toISOString();
  
  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  const params = {
    TableName: USERS_TABLE,
    Item: {
      userId,
      tenantId,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      status: 'ACTIVE',
      createdAt: timestamp,
      updatedAt: timestamp
    }
  };
  
  await dynamoDB.put(params).promise();
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = params.Item;
  return userWithoutPassword;
}

// Update a user
async function updateUser(userId, updates) {
  // Get current user
  const currentUser = await getUser(userId);
  
  if (!currentUser) {
    throw new Error('User not found');
  }
  
  // Prepare update expression and attribute values
  let updateExpression = 'SET updatedAt = :updatedAt';
  const expressionAttributeValues = {
    ':updatedAt': new Date().toISOString()
  };
  
  // Add fields to update
  if (updates.firstName) {
    updateExpression += ', firstName = :firstName';
    expressionAttributeValues[':firstName'] = updates.firstName;
  }
  
  if (updates.lastName) {
    updateExpression += ', lastName = :lastName';
    expressionAttributeValues[':lastName'] = updates.lastName;
  }
  
  if (updates.role) {
    updateExpression += ', role = :role';
    expressionAttributeValues[':role'] = updates.role;
  }
  
  if (updates.status) {
    updateExpression += ', status = :status';
    expressionAttributeValues[':status'] = updates.status;
  }
  
  // Update password if provided
  if (updates.password) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(updates.password, salt);
    
    updateExpression += ', password = :password';
    expressionAttributeValues[':password'] = hashedPassword;
  }
  
  const params = {
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  };
  
  const result = await dynamoDB.update(params).promise();
  
  // Return updated user without password
  const { password, ...userWithoutPassword } = result.Attributes;
  return userWithoutPassword;
}

// Delete a user
async function deleteUser(userId) {
  // Check if user exists
  const user = await getUser(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const params = {
    TableName: USERS_TABLE,
    Key: { userId }
  };
  
  await dynamoDB.delete(params).promise();
  
  return { userId };
}

// Get user by email
async function getUserByEmail(email) {
  const params = {
    TableName: USERS_TABLE,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email
    }
  };
  
  const result = await dynamoDB.query(params).promise();
  
  if (result.Items.length > 0) {
    return result.Items[0];
  }
  
  return null;
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
    
    // Get tenant ID from request
    const tenantId = body.tenantId || (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims && event.requestContext.authorizer.claims['custom:tenantId']);
    
    // Handle different HTTP methods and paths
    if (httpMethod === 'GET' && path === '/users') {
      // Get users
      const limit = parseInt(event.queryStringParameters?.limit || '20');
      const lastEvaluatedKey = event.queryStringParameters?.lastEvaluatedKey ? JSON.parse(decodeURIComponent(event.queryStringParameters.lastEvaluatedKey)) : null;
      
      const result = await getUsers(tenantId, limit, lastEvaluatedKey);
      
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
    } else if (httpMethod === 'POST' && path === '/users') {
      // Create user
      const { email, password, firstName, lastName, role } = body;
      
      if (!email || !password || !firstName || !lastName) {
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
      
      const user = await createUser(tenantId, email, password, firstName, lastName, role);
      
      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'User created successfully',
          user
        })
      };
    } else if (httpMethod === 'GET' && pathParameters.userId) {
      // Get user by ID
      const userId = pathParameters.userId;
      const user = await getUser(userId);
      
      if (!user) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            message: 'User not found'
          })
        };
      }
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(user)
      };
    } else if (httpMethod === 'PUT' && pathParameters.userId) {
      // Update user
      const userId = pathParameters.userId;
      const updates = body;
      
      const user = await updateUser(userId, updates);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'User updated successfully',
          user
        })
      };
    } else if (httpMethod === 'DELETE' && pathParameters.userId) {
      // Delete user
      const userId = pathParameters.userId;
      await deleteUser(userId);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'User deleted successfully',
          userId
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