const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamoDb = new AWS.DynamoDB.DocumentClient();

/**
 * Authentication Lambda function handler
 * 
 * This function handles authentication-related operations including:
 * - User login
 * - Token validation
 * - Permission checks
 * - User registration verification
 */
exports.handler = async (event) => {
  console.log('Authentication Lambda invoked with event:', JSON.stringify(event));
  
  try {
    // Get request context and path parameters
    const path = event.path;
    const httpMethod = event.httpMethod;
    const requestBody = JSON.parse(event.body || '{}');
    
    // Get environment variables
    const userPoolId = process.env.USER_POOL_ID;
    const tableName = process.env.DYNAMODB_TABLE;
    
    // Route the request based on the path and method
    if (path.endsWith('/login') && httpMethod === 'POST') {
      return await handleLogin(requestBody, userPoolId);
    } else if (path.endsWith('/token') && httpMethod === 'POST') {
      return await handleTokenRefresh(requestBody, userPoolId);
    } else if (path.endsWith('/verify') && httpMethod === 'POST') {
      return await handleVerify(requestBody, userPoolId);
    } else if (path.endsWith('/reset-password') && httpMethod === 'POST') {
      return await handleResetPassword(requestBody, userPoolId);
    } else {
      return formatResponse(400, { 
        message: 'Invalid request path or method'
      });
    }
  } catch (error) {
    console.error('Error processing authentication request:', error);
    
    // Handle specific error types
    if (error.code === 'NotAuthorizedException') {
      return formatResponse(401, { 
        message: 'Invalid credentials' 
      });
    } else if (error.code === 'UserNotFoundException') {
      return formatResponse(404, { 
        message: 'User not found' 
      });
    } else if (error.code === 'LimitExceededException') {
      return formatResponse(429, { 
        message: 'Too many requests, please try again later' 
      });
    }
    
    // Generic error response
    return formatResponse(500, { 
      message: 'Internal server error',
      error: error.message 
    });
  }
};

/**
 * Handle user login
 * @param {Object} requestBody - Request body containing username and password
 * @param {string} userPoolId - Cognito User Pool ID
 * @returns {Object} - Response object
 */
async function handleLogin(requestBody, userPoolId) {
  const { username, password } = requestBody;
  
  if (!username || !password) {
    return formatResponse(400, { 
      message: 'Username and password are required' 
    });
  }
  
  // Check if the request is coming from an admin user
  const isAdmin = requestBody.isAdmin === true;
  
  try {
    let authResult;
    
    if (isAdmin) {
      // Admin auth flow
      authResult = await cognito.adminInitiateAuth({
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        ClientId: process.env.CLIENT_ID,
        UserPoolId: userPoolId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password
        }
      }).promise();
    } else {
      // Regular user auth flow
      authResult = await cognito.initiateAuth({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: process.env.CLIENT_ID,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password
        }
      }).promise();
    }
    
    // Get user attributes
    const userInfo = await getUserInfo(username, userPoolId);
    
    // Log the login activity
    await logUserActivity(username, 'LOGIN', userInfo.userSub);
    
    return formatResponse(200, {
      message: 'Login successful',
      tokens: {
        accessToken: authResult.AuthenticationResult.AccessToken,
        idToken: authResult.AuthenticationResult.IdToken,
        refreshToken: authResult.AuthenticationResult.RefreshToken,
        expiresIn: authResult.AuthenticationResult.ExpiresIn
      },
      user: userInfo
    });
  } catch (error) {
    console.error('Login error:', error);
    
    if (error.code === 'UserNotConfirmedException') {
      return formatResponse(403, { 
        message: 'User is not confirmed',
        type: 'UserNotConfirmedException'
      });
    } else if (error.code === 'PasswordResetRequiredException') {
      return formatResponse(403, { 
        message: 'Password reset required',
        type: 'PasswordResetRequiredException'
      });
    } else if (error.code === 'NotAuthorizedException') {
      return formatResponse(401, { 
        message: 'Incorrect username or password' 
      });
    }
    
    throw error;
  }
}

/**
 * Handle token refresh
 * @param {Object} requestBody - Request body containing refresh token
 * @param {string} userPoolId - Cognito User Pool ID
 * @returns {Object} - Response object
 */
async function handleTokenRefresh(requestBody, userPoolId) {
  const { refreshToken } = requestBody;
  
  if (!refreshToken) {
    return formatResponse(400, { 
      message: 'Refresh token is required' 
    });
  }
  
  try {
    const result = await cognito.initiateAuth({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: process.env.CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken
      }
    }).promise();
    
    return formatResponse(200, {
      message: 'Token refreshed successfully',
      tokens: {
        accessToken: result.AuthenticationResult.AccessToken,
        idToken: result.AuthenticationResult.IdToken,
        expiresIn: result.AuthenticationResult.ExpiresIn
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error.code === 'NotAuthorizedException') {
      return formatResponse(401, { 
        message: 'Invalid refresh token' 
      });
    }
    
    throw error;
  }
}

/**
 * Handle user verification
 * @param {Object} requestBody - Request body containing username and verification code
 * @param {string} userPoolId - Cognito User Pool ID
 * @returns {Object} - Response object
 */
async function handleVerify(requestBody, userPoolId) {
  const { username, code } = requestBody;
  
  if (!username || !code) {
    return formatResponse(400, { 
      message: 'Username and verification code are required' 
    });
  }
  
  try {
    await cognito.confirmSignUp({
      ClientId: process.env.CLIENT_ID,
      Username: username,
      ConfirmationCode: code
    }).promise();
    
    return formatResponse(200, {
      message: 'User verified successfully'
    });
  } catch (error) {
    console.error('Verification error:', error);
    
    if (error.code === 'CodeMismatchException') {
      return formatResponse(400, { 
        message: 'Invalid verification code' 
      });
    } else if (error.code === 'ExpiredCodeException') {
      return formatResponse(400, { 
        message: 'Verification code has expired' 
      });
    }
    
    throw error;
  }
}

/**
 * Handle password reset
 * @param {Object} requestBody - Request body with username, new password and confirmation code
 * @param {string} userPoolId - Cognito User Pool ID
 * @returns {Object} - Response object
 */
async function handleResetPassword(requestBody, userPoolId) {
  const { username, password, code } = requestBody;
  
  // For the initial password reset request (sending the code)
  if (username && !password && !code) {
    try {
      await cognito.forgotPassword({
        ClientId: process.env.CLIENT_ID,
        Username: username
      }).promise();
      
      return formatResponse(200, {
        message: 'Password reset code sent successfully'
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }
  
  // For the password reset confirmation
  if (!username || !password || !code) {
    return formatResponse(400, { 
      message: 'Username, new password, and confirmation code are required' 
    });
  }
  
  try {
    await cognito.confirmForgotPassword({
      ClientId: process.env.CLIENT_ID,
      Username: username,
      Password: password,
      ConfirmationCode: code
    }).promise();
    
    return formatResponse(200, {
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Password reset confirmation error:', error);
    
    if (error.code === 'CodeMismatchException') {
      return formatResponse(400, { 
        message: 'Invalid confirmation code' 
      });
    } else if (error.code === 'ExpiredCodeException') {
      return formatResponse(400, { 
        message: 'Confirmation code has expired' 
      });
    } else if (error.code === 'InvalidPasswordException') {
      return formatResponse(400, { 
        message: 'Password does not meet requirements' 
      });
    }
    
    throw error;
  }
}

/**
 * Get user information from Cognito
 * @param {string} username - Username
 * @param {string} userPoolId - Cognito User Pool ID
 * @returns {Object} - User information
 */
async function getUserInfo(username, userPoolId) {
  try {
    const userData = await cognito.adminGetUser({
      UserPoolId: userPoolId,
      Username: username
    }).promise();
    
    // Map user attributes to a more user-friendly format
    const userAttributes = {};
    userData.UserAttributes.forEach(attr => {
      userAttributes[attr.Name] = attr.Value;
    });
    
    return {
      username: userData.Username,
      userSub: userAttributes['sub'],
      email: userAttributes['email'],
      emailVerified: userAttributes['email_verified'] === 'true',
      phoneNumber: userAttributes['phone_number'],
      givenName: userAttributes['given_name'],
      familyName: userAttributes['family_name'],
      tenantId: userAttributes['custom:tenantId'],
      role: userAttributes['custom:role'],
      createdAt: userData.UserCreateDate,
      lastModifiedAt: userData.UserLastModifiedDate,
      enabled: userData.Enabled,
      status: userData.UserStatus
    };
  } catch (error) {
    console.error('Error getting user info:', error);
    throw error;
  }
}

/**
 * Log user activity in DynamoDB
 * @param {string} username - Username
 * @param {string} activity - Activity type
 * @param {string} userSub - User sub ID
 */
async function logUserActivity(username, activity, userSub) {
  try {
    const timestamp = new Date().toISOString();
    
    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Item: {
        PK: `USER#${userSub}`,
        SK: `ACTIVITY#${timestamp}`,
        GSI1PK: 'ACTIVITY',
        GSI1SK: timestamp,
        username,
        activity,
        timestamp,
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
      }
    };
    
    await dynamoDb.put(params).promise();
  } catch (error) {
    console.error('Error logging user activity:', error);
    // Don't throw this error as it's non-critical
  }
}

/**
 * Format the Lambda response
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body
 * @returns {Object} - Formatted response
 */
function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Update for production
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify(body)
  };
}
