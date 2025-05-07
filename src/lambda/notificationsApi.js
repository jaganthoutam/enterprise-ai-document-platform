const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE;

/**
 * Get all notifications for a user
 */
exports.getNotifications = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    
    const params = {
      TableName: NOTIFICATIONS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ScanIndexForward: false // Sort in descending order (newest first)
    };
    
    const result = await dynamoDB.query(params).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        notifications: result.Items
      })
    };
  } catch (error) {
    console.error('Error getting notifications:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Error getting notifications'
      })
    };
  }
};

/**
 * Mark a notification as read
 */
exports.markNotificationAsRead = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    const notificationId = event.pathParameters.id;
    
    const params = {
      TableName: NOTIFICATIONS_TABLE,
      Key: {
        userId: userId,
        id: notificationId
      },
      UpdateExpression: 'SET #read = :read',
      ExpressionAttributeNames: {
        '#read': 'read'
      },
      ExpressionAttributeValues: {
        ':read': true
      },
      ReturnValues: 'ALL_NEW'
    };
    
    await dynamoDB.update(params).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Notification marked as read'
      })
    };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Error marking notification as read'
      })
    };
  }
};

/**
 * Mark all notifications as read
 */
exports.markAllNotificationsAsRead = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    
    // First, get all unread notifications
    const queryParams = {
      TableName: NOTIFICATIONS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: '#read = :read',
      ExpressionAttributeNames: {
        '#read': 'read'
      },
      ExpressionAttributeValues: {
        ':userId': userId,
        ':read': false
      }
    };
    
    const result = await dynamoDB.query(queryParams).promise();
    
    // Then, update each notification
    const updatePromises = result.Items.map(item => {
      const updateParams = {
        TableName: NOTIFICATIONS_TABLE,
        Key: {
          userId: userId,
          id: item.id
        },
        UpdateExpression: 'SET #read = :read',
        ExpressionAttributeNames: {
          '#read': 'read'
        },
        ExpressionAttributeValues: {
          ':read': true
        }
      };
      
      return dynamoDB.update(updateParams).promise();
    });
    
    await Promise.all(updatePromises);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'All notifications marked as read'
      })
    };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Error marking all notifications as read'
      })
    };
  }
};

/**
 * Delete a notification
 */
exports.deleteNotification = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    const notificationId = event.pathParameters.id;
    
    const params = {
      TableName: NOTIFICATIONS_TABLE,
      Key: {
        userId: userId,
        id: notificationId
      }
    };
    
    await dynamoDB.delete(params).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Notification deleted'
      })
    };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Error deleting notification'
      })
    };
  }
};

/**
 * Clear all notifications
 */
exports.clearAllNotifications = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    
    // First, get all notifications
    const queryParams = {
      TableName: NOTIFICATIONS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    };
    
    const result = await dynamoDB.query(queryParams).promise();
    
    // Then, delete each notification
    const deletePromises = result.Items.map(item => {
      const deleteParams = {
        TableName: NOTIFICATIONS_TABLE,
        Key: {
          userId: userId,
          id: item.id
        }
      };
      
      return dynamoDB.delete(deleteParams).promise();
    });
    
    await Promise.all(deletePromises);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'All notifications cleared'
      })
    };
  } catch (error) {
    console.error('Error clearing all notifications:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Error clearing all notifications'
      })
    };
  }
};

/**
 * Get unread notification count
 */
exports.getUnreadNotificationCount = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    
    const params = {
      TableName: NOTIFICATIONS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: '#read = :read',
      ExpressionAttributeNames: {
        '#read': 'read'
      },
      ExpressionAttributeValues: {
        ':userId': userId,
        ':read': false
      },
      Select: 'COUNT'
    };
    
    const result = await dynamoDB.query(params).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        count: result.Count
      })
    };
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Error getting unread notification count'
      })
    };
  }
};

/**
 * Create a notification
 * This is a helper function that can be called from other Lambda functions
 */
exports.createNotification = async (userId, title, message, type = 'info', metadata = {}) => {
  try {
    const notificationId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const notification = {
      userId,
      id: notificationId,
      title,
      message,
      type,
      read: false,
      timestamp,
      ...metadata
    };
    
    const params = {
      TableName: NOTIFICATIONS_TABLE,
      Item: notification
    };
    
    await dynamoDB.put(params).promise();
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Create a notification for a specific user
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
exports.createNotification = async (event) => {
  try {
    const { userId, title, message, type = 'info', metadata = {} } = JSON.parse(event.body);
    
    if (!userId || !title || !message) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
          message: 'Missing required fields: userId, title, and message are required'
        })
      };
    }
    
    const notification = await createNotification(userId, title, message, type, metadata);
    
    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(notification)
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: 'Error creating notification',
        error: error.message
      })
    };
  }
};

/**
 * Create a notification for the current user
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
exports.createNotificationForCurrentUser = async (event) => {
  try {
    const { title, message, type = 'info', metadata = {} } = JSON.parse(event.body);
    
    if (!title || !message) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
          message: 'Missing required fields: title and message are required'
        })
      };
    }
    
    // Get the current user ID from the request context
    const userId = event.requestContext.authorizer.claims.sub;
    
    const notification = await createNotification(userId, title, message, type, metadata);
    
    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(notification)
    };
  } catch (error) {
    console.error('Error creating notification for current user:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: 'Error creating notification for current user',
        error: error.message
      })
    };
  }
};

/**
 * Create a notification for all users
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
exports.createNotificationForAllUsers = async (event) => {
  try {
    const { title, message, type = 'info', metadata = {} } = JSON.parse(event.body);
    
    if (!title || !message) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
          message: 'Missing required fields: title and message are required'
        })
      };
    }
    
    // Get all users from the Users table
    const params = {
      TableName: process.env.USERS_TABLE
    };
    
    const result = await dynamoDB.scan(params).promise();
    const users = result.Items;
    
    // Create notifications for all users
    const notifications = [];
    for (const user of users) {
      const notification = await createNotification(user.id, title, message, type, metadata);
      notifications.push(notification);
    }
    
    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Created ${notifications.length} notifications`,
        notifications
      })
    };
  } catch (error) {
    console.error('Error creating notifications for all users:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: 'Error creating notifications for all users',
        error: error.message
      })
    };
  }
};

/**
 * Create a notification for users with a specific role
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
exports.createNotificationForUsersWithRole = async (event) => {
  try {
    const { role, title, message, type = 'info', metadata = {} } = JSON.parse(event.body);
    
    if (!role || !title || !message) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
          message: 'Missing required fields: role, title, and message are required'
        })
      };
    }
    
    // Get users with the specified role from the Users table
    const params = {
      TableName: process.env.USERS_TABLE,
      FilterExpression: 'contains(roles, :role)',
      ExpressionAttributeValues: {
        ':role': role
      }
    };
    
    const result = await dynamoDB.scan(params).promise();
    const users = result.Items;
    
    // Create notifications for users with the specified role
    const notifications = [];
    for (const user of users) {
      const notification = await createNotification(user.id, title, message, type, metadata);
      notifications.push(notification);
    }
    
    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Created ${notifications.length} notifications for users with role ${role}`,
        notifications
      })
    };
  } catch (error) {
    console.error('Error creating notifications for users with role:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: 'Error creating notifications for users with role',
        error: error.message
      })
    };
  }
}; 