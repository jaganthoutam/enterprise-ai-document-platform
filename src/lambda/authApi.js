const AWS = require('aws-sdk');
const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminDeleteUserCommand, AdminGetUserCommand, AdminUpdateUserAttributesCommand, ListUsersCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

// Initialize AWS clients
const cognito = new CognitoIdentityProviderClient();
const secretsManager = new SecretsManagerClient();

// Environment variables
const USER_POOL_ID = process.env.USER_POOL_ID;
const SECRETS_ARN = process.env.SECRETS_ARN;

// Get secrets from Secrets Manager
async function getSecrets() {
  const command = new GetSecretValueCommand({
    SecretId: SECRETS_ARN
  });
  
  const response = await secretsManager.send(command);
  return JSON.parse(response.SecretString);
}

// Create a user
async function createUser(email, firstName, lastName, role, tenantId) {
  const command = new AdminCreateUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
    UserAttributes: [
      {
        Name: 'email',
        Value: email
      },
      {
        Name: 'email_verified',
        Value: 'true'
      },
      {
        Name: 'given_name',
        Value: firstName
      },
      {
        Name: 'family_name',
        Value: lastName
      },
      {
        Name: 'custom:role',
        Value: role
      },
      {
        Name: 'custom:tenantId',
        Value: tenantId
      }
    ],
    MessageAction: 'SUPPRESS'
  });
  
  const response = await cognito.send(command);
  
  // Set temporary password
  const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
  await setUserPassword(email, tempPassword);
  
  return {
    ...response.User,
    tempPassword
  };
}

// Set user password
async function setUserPassword(email, password) {
  const command = new AdminSetUserPasswordCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
    Password: password,
    Permanent: true
  });
  
  return await cognito.send(command);
}

// Delete a user
async function deleteUser(email) {
  const command = new AdminDeleteUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: email
  });
  
  return await cognito.send(command);
}

// Get user details
async function getUser(email) {
  const command = new AdminGetUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: email
  });
  
  const response = await cognito.send(command);
  return response.User;
}

// Update user attributes
async function updateUserAttributes(email, attributes) {
  const userAttributes = Object.entries(attributes).map(([key, value]) => ({
    Name: key,
    Value: value
  }));
  
  const command = new AdminUpdateUserAttributesCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
    UserAttributes: userAttributes
  });
  
  return await cognito.send(command);
}

// List users
async function listUsers(limit = 20, paginationToken = null) {
  const params = {
    UserPoolId: USER_POOL_ID,
    Limit: limit
  };
  
  if (paginationToken) {
    params.PaginationToken = paginationToken;
  }
  
  const command = new ListUsersCommand(params);
  const response = await cognito.send(command);
  
  return {
    users: response.Users,
    paginationToken: response.PaginationToken
  };
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
    if (httpMethod === 'POST' && path === '/auth/users') {
      // Create user
      const { email, firstName, lastName, role, tenantId } = body;
      
      if (!email || !firstName || !lastName || !tenantId) {
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
      
      const user = await createUser(email, firstName, lastName, role || 'user', tenantId);
      
      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'User created successfully',
          user: {
            username: user.Username,
            email: user.Attributes.find(attr => attr.Name === 'email')?.Value,
            firstName: user.Attributes.find(attr => attr.Name === 'given_name')?.Value,
            lastName: user.Attributes.find(attr => attr.Name === 'family_name')?.Value,
            role: user.Attributes.find(attr => attr.Name === 'custom:role')?.Value,
            tenantId: user.Attributes.find(attr => attr.Name === 'custom:tenantId')?.Value,
            tempPassword: user.tempPassword
          }
        })
      };
    } else if (httpMethod === 'GET' && pathParameters.email) {
      // Get user by email
      const email = pathParameters.email;
      const user = await getUser(email);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          user: {
            username: user.Username,
            email: user.Attributes.find(attr => attr.Name === 'email')?.Value,
            firstName: user.Attributes.find(attr => attr.Name === 'given_name')?.Value,
            lastName: user.Attributes.find(attr => attr.Name === 'family_name')?.Value,
            role: user.Attributes.find(attr => attr.Name === 'custom:role')?.Value,
            tenantId: user.Attributes.find(attr => attr.Name === 'custom:tenantId')?.Value,
            status: user.UserStatus,
            enabled: user.Enabled,
            createdAt: user.UserCreateDate,
            updatedAt: user.UserLastModifiedDate
          }
        })
      };
    } else if (httpMethod === 'PUT' && pathParameters.email) {
      // Update user
      const email = pathParameters.email;
      const attributes = body;
      
      await updateUserAttributes(email, attributes);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'User updated successfully'
        })
      };
    } else if (httpMethod === 'DELETE' && pathParameters.email) {
      // Delete user
      const email = pathParameters.email;
      await deleteUser(email);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'User deleted successfully'
        })
      };
    } else if (httpMethod === 'GET' && path === '/auth/users') {
      // List users
      const limit = parseInt(event.queryStringParameters?.limit || '20');
      const paginationToken = event.queryStringParameters?.paginationToken;
      
      const result = await listUsers(limit, paginationToken);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          users: result.users.map(user => ({
            username: user.Username,
            email: user.Attributes.find(attr => attr.Name === 'email')?.Value,
            firstName: user.Attributes.find(attr => attr.Name === 'given_name')?.Value,
            lastName: user.Attributes.find(attr => attr.Name === 'family_name')?.Value,
            role: user.Attributes.find(attr => attr.Name === 'custom:role')?.Value,
            tenantId: user.Attributes.find(attr => attr.Name === 'custom:tenantId')?.Value,
            status: user.UserStatus,
            enabled: user.Enabled,
            createdAt: user.UserCreateDate,
            updatedAt: user.UserLastModifiedDate
          })),
          paginationToken: result.paginationToken
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