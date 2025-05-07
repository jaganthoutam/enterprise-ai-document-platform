import { API } from 'aws-amplify';

// API name from Amplify configuration
const API_NAME = 'api';

/**
 * Create a notification for a user
 * @param {string} userId - User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (info, warning, error)
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} - Created notification
 */
export const createNotification = async (userId, title, message, type = 'info', metadata = {}) => {
  try {
    const response = await API.post(API_NAME, '/notifications/create', {
      body: {
        userId,
        title,
        message,
        type,
        metadata
      }
    });
    return response;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Create a notification for the current user
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (info, warning, error)
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} - Created notification
 */
export const createNotificationForCurrentUser = async (title, message, type = 'info', metadata = {}) => {
  try {
    const response = await API.post(API_NAME, '/notifications/create-for-current-user', {
      body: {
        title,
        message,
        type,
        metadata
      }
    });
    return response;
  } catch (error) {
    console.error('Error creating notification for current user:', error);
    throw error;
  }
};

/**
 * Create a notification for all users
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (info, warning, error)
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} - Created notifications
 */
export const createNotificationForAllUsers = async (title, message, type = 'info', metadata = {}) => {
  try {
    const response = await API.post(API_NAME, '/notifications/create-for-all-users', {
      body: {
        title,
        message,
        type,
        metadata
      }
    });
    return response;
  } catch (error) {
    console.error('Error creating notification for all users:', error);
    throw error;
  }
};

/**
 * Create a notification for users with a specific role
 * @param {string} role - User role
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (info, warning, error)
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} - Created notifications
 */
export const createNotificationForUsersWithRole = async (role, title, message, type = 'info', metadata = {}) => {
  try {
    const response = await API.post(API_NAME, '/notifications/create-for-users-with-role', {
      body: {
        role,
        title,
        message,
        type,
        metadata
      }
    });
    return response;
  } catch (error) {
    console.error('Error creating notification for users with role:', error);
    throw error;
  }
};

/**
 * Create a document analysis notification
 * @param {string} userId - User ID
 * @param {string} documentName - Document name
 * @param {string} status - Analysis status (completed, failed)
 * @param {string} message - Additional message
 * @returns {Promise<Object>} - Created notification
 */
export const createDocumentAnalysisNotification = async (userId, documentName, status, message = '') => {
  const title = `Document Analysis ${status === 'completed' ? 'Completed' : 'Failed'}`;
  const notificationMessage = `Analysis for document "${documentName}" has ${status === 'completed' ? 'completed successfully' : 'failed'}. ${message}`;
  const type = status === 'completed' ? 'info' : 'error';
  
  return createNotification(userId, title, notificationMessage, type, {
    documentName,
    status,
    type: 'documentAnalysis'
  });
};

/**
 * Create a system maintenance notification
 * @param {string} title - Maintenance title
 * @param {string} message - Maintenance message
 * @param {Date} startTime - Maintenance start time
 * @param {Date} endTime - Maintenance end time
 * @returns {Promise<Object>} - Created notifications
 */
export const createSystemMaintenanceNotification = async (title, message, startTime, endTime) => {
  return createNotificationForAllUsers(
    title,
    message,
    'warning',
    {
      type: 'maintenance',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    }
  );
}; 