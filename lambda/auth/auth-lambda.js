const { CognitoIdentityProviderClient, AdminInitiateAuthCommand, AdminRespondToAuthChallengeCommand, AdminGetUserCommand, AdminForgotPasswordCommand, AdminConfirmForgotPasswordCommand, AdminSetUserPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBClient, GetItemCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

// Initialize AWS clients
const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });

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
      const command = new AdminInitiateAuthCommand({
        UserPoolId: userPoolId,
        ClientId: process.env.CLIENT_ID,
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password
        }
      });
      
      authResult = await cognito.send(command);
    } else {
      // Regular user auth flow
      const command = new AdminInitiateAuthCommand({
        UserPoolId: userPoolId,
        ClientId: process.env.CLIENT_ID,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password
        }
      });
      
      authResult = await cognito.send(command);
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
    const command = new AdminInitiateAuthCommand({
      UserPoolId: userPoolId,
      ClientId: process.env.CLIENT_ID,
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      AuthParameters: {
        REFRESH_TOKEN: refreshToken
      }
    });
    
    const response = await cognito.send(command);
    
    return formatResponse(200, {
      message: 'Token refreshed successfully',
      tokens: {
        accessToken: response.AuthenticationResult.AccessToken,
        idToken: response.AuthenticationResult.IdToken,
        expiresIn: response.AuthenticationResult.ExpiresIn
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
    const command = new AdminRespondToAuthChallengeCommand({
      UserPoolId: userPoolId,
      ClientId: process.env.CLIENT_ID,
      ChallengeName: 'SOFTWARE_TOKEN_MFA',
      Session: requestBody.session,
      ChallengeResponses: {
        USERNAME: username,
        SOFTWARE_TOKEN_MFA_CODE: code,
      },
    });
    
    const response = await cognito.send(command);
    
    return formatResponse(200, {
      accessToken: response.AuthenticationResult.AccessToken,
      idToken: response.AuthenticationResult.IdToken,
      refreshToken: response.AuthenticationResult.RefreshToken,
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
 * @param {Object} requestBody - Request body containing username and new password
 * @param {string} userPoolId - Cognito User Pool ID
 * @returns {Object} - Response object
 */
async function handleResetPassword(requestBody, userPoolId) {
  const { username, newPassword, confirmationCode } = requestBody;
  
  if (!username) {
    return formatResponse(400, { 
      message: 'Username is required' 
    });
  }
  
  try {
    if (confirmationCode) {
      // Confirm password reset
      if (!newPassword) {
        return formatResponse(400, { 
          message: 'New password is required for confirmation' 
        });
      }
      
      const command = new AdminConfirmForgotPasswordCommand({
        UserPoolId: userPoolId,
        Username: username,
        ConfirmationCode: confirmationCode,
        Password: newPassword
      });
      
      await cognito.send(command);
      
      return formatResponse(200, { 
        message: 'Password reset successful' 
      });
    } else {
      // Initiate password reset
      const command = new AdminForgotPasswordCommand({
        UserPoolId: userPoolId,
        Username: username
      });
      
      await cognito.send(command);
      
      return formatResponse(200, { 
        message: 'Password reset code sent to registered email' 
      });
    }
  } catch (error) {
    console.error('Password reset error:', error);
    
    if (error.code === 'UserNotFoundException') {
      return formatResponse(404, { 
        message: 'User not found' 
      });
    } else if (error.code === 'InvalidPasswordException') {
      return formatResponse(400, { 
        message: 'Password does not meet requirements' 
      });
    } else if (error.code === 'CodeMismatchException') {
      return formatResponse(400, { 
        message: 'Invalid confirmation code' 
      });
    } else if (error.code === 'ExpiredCodeException') {
      return formatResponse(400, { 
        message: 'Confirmation code has expired' 
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
    const command = new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: username
    });
    
    const response = await cognito.send(command);
    
    // Extract user attributes
    const userAttributes = {};
    response.UserAttributes.forEach(attr => {
      userAttributes[attr.Name] = attr.Value;
    });
    
    return {
      username: username,
      userSub: response.Username,
      email: userAttributes.email,
      emailVerified: userAttributes.email_verified === 'true',
      status: response.UserStatus,
      enabled: response.Enabled,
      created: userAttributes.created_at,
      lastModified: userAttributes.updated_at,
      attributes: userAttributes
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
 * @param {string} userSub - User sub
 * @returns {Promise<void>}
 */
async function logUserActivity(username, activity, userSub) {
  try {
    const timestamp = new Date().toISOString();
    const item = {
      userId: userSub,
      username: username,
      activity: activity,
      timestamp: timestamp,
      ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days TTL
    };
    
    const command = new PutItemCommand({
      TableName: process.env.ACTIVITY_LOG_TABLE,
      Item: marshall(item)
    });
    
    await dynamoDB.send(command);
  } catch (error) {
    console.error('Error logging user activity:', error);
    // Don't throw error as this is non-critical
  }
}

/**
 * Format API response
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body
 * @returns {Object} - Formatted response
 */
function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify(body)
  };
}
