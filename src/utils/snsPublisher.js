const AWS = require('aws-sdk');
const sns = new AWS.SNS();

/**
 * Publish a message to an SNS topic
 * @param {string} topicArn - SNS topic ARN
 * @param {Object} message - Message to publish
 * @returns {Promise<Object>} - SNS publish response
 */
const publishToTopic = async (topicArn, message) => {
  const params = {
    TopicArn: topicArn,
    Message: JSON.stringify(message),
    MessageAttributes: {
      'notificationType': {
        DataType: 'String',
        StringValue: message.type || 'info'
      }
    }
  };
  
  return sns.publish(params).promise();
};

/**
 * Publish a document analysis notification
 * @param {string} userId - User ID
 * @param {string} documentName - Document name
 * @param {string} status - Analysis status (completed, failed)
 * @param {string} message - Additional message
 * @returns {Promise<Object>} - SNS publish response
 */
exports.publishDocumentAnalysisNotification = async (userId, documentName, status, message = '') => {
  const topicArn = process.env.DOCUMENT_ANALYSIS_NOTIFICATION_TOPIC_ARN;
  
  if (!topicArn) {
    throw new Error('Document analysis notification topic ARN not configured');
  }
  
  const notification = {
    userId,
    documentName,
    status,
    message,
    type: 'documentAnalysis'
  };
  
  return publishToTopic(topicArn, notification);
};

/**
 * Publish a system maintenance notification
 * @param {string} title - Maintenance title
 * @param {string} message - Maintenance message
 * @param {Date} startTime - Maintenance start time
 * @param {Date} endTime - Maintenance end time
 * @returns {Promise<Object>} - SNS publish response
 */
exports.publishSystemMaintenanceNotification = async (title, message, startTime, endTime) => {
  const topicArn = process.env.SYSTEM_MAINTENANCE_NOTIFICATION_TOPIC_ARN;
  
  if (!topicArn) {
    throw new Error('System maintenance notification topic ARN not configured');
  }
  
  const notification = {
    title,
    message,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    type: 'maintenance'
  };
  
  return publishToTopic(topicArn, notification);
};

/**
 * Publish a user role change notification
 * @param {string} userId - User ID
 * @param {string} newRole - New role
 * @param {string} message - Additional message
 * @returns {Promise<Object>} - SNS publish response
 */
exports.publishUserRoleChangeNotification = async (userId, newRole, message = '') => {
  const topicArn = process.env.USER_ROLE_CHANGE_NOTIFICATION_TOPIC_ARN;
  
  if (!topicArn) {
    throw new Error('User role change notification topic ARN not configured');
  }
  
  const notification = {
    userId,
    newRole,
    message,
    type: 'roleChange'
  };
  
  return publishToTopic(topicArn, notification);
};

/**
 * Publish a tenant creation notification
 * @param {string} tenantId - Tenant ID
 * @param {string} tenantName - Tenant name
 * @param {string} adminUserId - Admin user ID
 * @returns {Promise<Object>} - SNS publish response
 */
exports.publishTenantCreationNotification = async (tenantId, tenantName, adminUserId) => {
  const topicArn = process.env.TENANT_CREATION_NOTIFICATION_TOPIC_ARN;
  
  if (!topicArn) {
    throw new Error('Tenant creation notification topic ARN not configured');
  }
  
  const notification = {
    tenantId,
    tenantName,
    adminUserId,
    type: 'tenantCreation'
  };
  
  return publishToTopic(topicArn, notification);
}; 