const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

/**
 * Create a notification for a user
 * @param {string} userId - User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (info, warning, error)
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} - Created notification
 */
const createNotification = async (userId, title, message, type = 'info', metadata = {}) => {
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  const timestamp = new Date().toISOString();
  
  const notification = {
    id,
    userId,
    title,
    message,
    type,
    metadata,
    read: false,
    createdAt: timestamp
  };
  
  const params = {
    TableName: process.env.NOTIFICATIONS_TABLE,
    Item: notification
  };
  
  await dynamoDB.put(params).promise();
  return notification;
};

/**
 * Process document analysis notifications
 * @param {Object} event - SNS event
 * @returns {Promise<void>}
 */
exports.processDocumentAnalysisNotification = async (event) => {
  try {
    // Parse the SNS message
    const snsMessage = JSON.parse(event.Records[0].Sns.Message);
    const { userId, documentName, status, message } = snsMessage;
    
    if (!userId || !documentName || !status) {
      console.error('Missing required fields in document analysis notification');
      return;
    }
    
    // Create the notification
    const title = `Document Analysis ${status === 'completed' ? 'Completed' : 'Failed'}`;
    const notificationMessage = `Analysis for document "${documentName}" has ${status === 'completed' ? 'completed successfully' : 'failed'}. ${message || ''}`;
    const type = status === 'completed' ? 'info' : 'error';
    
    await createNotification(userId, title, notificationMessage, type, {
      documentName,
      status,
      type: 'documentAnalysis'
    });
    
    console.log(`Created document analysis notification for user ${userId}`);
  } catch (error) {
    console.error('Error processing document analysis notification:', error);
    throw error;
  }
};

/**
 * Process system maintenance notifications
 * @param {Object} event - SNS event
 * @returns {Promise<void>}
 */
exports.processSystemMaintenanceNotification = async (event) => {
  try {
    // Parse the SNS message
    const snsMessage = JSON.parse(event.Records[0].Sns.Message);
    const { title, message, startTime, endTime } = snsMessage;
    
    if (!title || !message || !startTime || !endTime) {
      console.error('Missing required fields in system maintenance notification');
      return;
    }
    
    // Get all users from the Users table
    const params = {
      TableName: process.env.USERS_TABLE
    };
    
    const result = await dynamoDB.scan(params).promise();
    const users = result.Items;
    
    // Create notifications for all users
    for (const user of users) {
      await createNotification(
        user.id,
        title,
        message,
        'warning',
        {
          type: 'maintenance',
          startTime,
          endTime
        }
      );
    }
    
    console.log(`Created system maintenance notifications for ${users.length} users`);
  } catch (error) {
    console.error('Error processing system maintenance notification:', error);
    throw error;
  }
};

/**
 * Process user role change notifications
 * @param {Object} event - SNS event
 * @returns {Promise<void>}
 */
exports.processUserRoleChangeNotification = async (event) => {
  try {
    // Parse the SNS message
    const snsMessage = JSON.parse(event.Records[0].Sns.Message);
    const { userId, newRole, message } = snsMessage;
    
    if (!userId || !newRole) {
      console.error('Missing required fields in user role change notification');
      return;
    }
    
    // Create the notification
    const title = 'Role Updated';
    const notificationMessage = message || `Your role has been updated to ${newRole}`;
    
    await createNotification(userId, title, notificationMessage, 'info', {
      type: 'roleChange',
      newRole
    });
    
    console.log(`Created role change notification for user ${userId}`);
  } catch (error) {
    console.error('Error processing user role change notification:', error);
    throw error;
  }
};

/**
 * Process tenant creation notifications
 * @param {Object} event - SNS event
 * @returns {Promise<void>}
 */
exports.processTenantCreationNotification = async (event) => {
  try {
    // Parse the SNS message
    const snsMessage = JSON.parse(event.Records[0].Sns.Message);
    const { tenantId, tenantName, adminUserId } = snsMessage;
    
    if (!tenantId || !tenantName || !adminUserId) {
      console.error('Missing required fields in tenant creation notification');
      return;
    }
    
    // Create the notification for the admin user
    const title = 'Tenant Created';
    const message = `Your tenant "${tenantName}" has been created successfully.`;
    
    await createNotification(adminUserId, title, message, 'info', {
      type: 'tenantCreation',
      tenantId,
      tenantName
    });
    
    console.log(`Created tenant creation notification for admin user ${adminUserId}`);
  } catch (error) {
    console.error('Error processing tenant creation notification:', error);
    throw error;
  }
}; 