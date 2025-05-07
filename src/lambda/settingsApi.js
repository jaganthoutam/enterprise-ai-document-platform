const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Table names
const SETTINGS_TABLE = process.env.SETTINGS_TABLE;

/**
 * Get user settings
 */
exports.getSettings = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    
    const params = {
      TableName: SETTINGS_TABLE,
      Key: {
        userId: userId
      }
    };
    
    const result = await dynamoDB.get(params).promise();
    
    // If no settings exist, return default settings
    if (!result.Item) {
      const defaultSettings = {
        notifications: {
          email: true,
          push: true,
          documentUpdates: true,
          analysisComplete: true,
        },
        preferences: {
          darkMode: false,
          language: 'en',
          timezone: 'UTC',
        },
        security: {
          twoFactorAuth: false,
          sessionTimeout: 30,
        }
      };
      
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify({
          data: defaultSettings
        })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        data: result.Item.settings
      })
    };
  } catch (error) {
    console.error('Error getting settings:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Error getting settings'
      })
    };
  }
};

/**
 * Update user settings
 */
exports.updateSettings = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    const settings = JSON.parse(event.body).settings;
    
    const params = {
      TableName: SETTINGS_TABLE,
      Key: {
        userId: userId
      },
      UpdateExpression: 'SET settings = :settings',
      ExpressionAttributeValues: {
        ':settings': settings
      },
      ReturnValues: 'ALL_NEW'
    };
    
    const result = await dynamoDB.update(params).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        data: result.Attributes.settings
      })
    };
  } catch (error) {
    console.error('Error updating settings:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Error updating settings'
      })
    };
  }
};

/**
 * Get notification preferences
 */
exports.getNotificationPreferences = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    
    const params = {
      TableName: SETTINGS_TABLE,
      Key: {
        userId: userId
      }
    };
    
    const result = await dynamoDB.get(params).promise();
    
    // If no settings exist, return default notification preferences
    if (!result.Item || !result.Item.settings.notifications) {
      const defaultPreferences = {
        email: true,
        push: true,
        documentUpdates: true,
        analysisComplete: true,
      };
      
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify({
          data: defaultPreferences
        })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        data: result.Item.settings.notifications
      })
    };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Error getting notification preferences'
      })
    };
  }
};

/**
 * Update notification preferences
 */
exports.updateNotificationPreferences = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    const preferences = JSON.parse(event.body).preferences;
    
    // First, get current settings
    const getParams = {
      TableName: SETTINGS_TABLE,
      Key: {
        userId: userId
      }
    };
    
    const result = await dynamoDB.get(getParams).promise();
    
    // If no settings exist, create new settings with default values
    let currentSettings = {
      notifications: {
        email: true,
        push: true,
        documentUpdates: true,
        analysisComplete: true,
      },
      preferences: {
        darkMode: false,
        language: 'en',
        timezone: 'UTC',
      },
      security: {
        twoFactorAuth: false,
        sessionTimeout: 30,
      }
    };
    
    if (result.Item && result.Item.settings) {
      currentSettings = result.Item.settings;
    }
    
    // Update notification preferences
    currentSettings.notifications = preferences;
    
    // Save updated settings
    const updateParams = {
      TableName: SETTINGS_TABLE,
      Key: {
        userId: userId
      },
      UpdateExpression: 'SET settings = :settings',
      ExpressionAttributeValues: {
        ':settings': currentSettings
      },
      ReturnValues: 'ALL_NEW'
    };
    
    const updateResult = await dynamoDB.update(updateParams).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        data: updateResult.Attributes.settings.notifications
      })
    };
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Error updating notification preferences'
      })
    };
  }
};

/**
 * Get system settings (admin only)
 */
exports.getSystemSettings = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    
    // Check if user is admin
    const isAdmin = await checkIfUserIsAdmin(userId);
    
    if (!isAdmin) {
      return {
        statusCode: 403,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify({
          message: 'Unauthorized: Admin access required'
        })
      };
    }
    
    const params = {
      TableName: SETTINGS_TABLE,
      Key: {
        userId: 'SYSTEM'
      }
    };
    
    const result = await dynamoDB.get(params).promise();
    
    // If no system settings exist, return default system settings
    if (!result.Item) {
      const defaultSystemSettings = {
        maintenance: {
          enabled: false,
          message: '',
          scheduledEnd: null
        },
        features: {
          documentAnalysis: true,
          aiAssistant: true,
          notifications: true
        },
        limits: {
          maxFileSize: 10, // MB
          maxDocumentsPerUser: 100,
          maxConcurrentAnalyses: 5
        }
      };
      
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify({
          data: defaultSystemSettings
        })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        data: result.Item.settings
      })
    };
  } catch (error) {
    console.error('Error getting system settings:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Error getting system settings'
      })
    };
  }
};

/**
 * Update system settings (admin only)
 */
exports.updateSystemSettings = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    const settings = JSON.parse(event.body).settings;
    
    // Check if user is admin
    const isAdmin = await checkIfUserIsAdmin(userId);
    
    if (!isAdmin) {
      return {
        statusCode: 403,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify({
          message: 'Unauthorized: Admin access required'
        })
      };
    }
    
    const params = {
      TableName: SETTINGS_TABLE,
      Key: {
        userId: 'SYSTEM'
      },
      UpdateExpression: 'SET settings = :settings',
      ExpressionAttributeValues: {
        ':settings': settings
      },
      ReturnValues: 'ALL_NEW'
    };
    
    const result = await dynamoDB.update(params).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        data: result.Attributes.settings
      })
    };
  } catch (error) {
    console.error('Error updating system settings:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Error updating system settings'
      })
    };
  }
};

/**
 * Helper function to check if a user is an admin
 */
async function checkIfUserIsAdmin(userId) {
  try {
    const params = {
      TableName: process.env.USERS_TABLE,
      Key: {
        id: userId
      }
    };
    
    const result = await dynamoDB.get(params).promise();
    
    if (!result.Item) {
      return false;
    }
    
    return result.Item.role === 'admin';
  } catch (error) {
    console.error('Error checking if user is admin:', error);
    return false;
  }
} 