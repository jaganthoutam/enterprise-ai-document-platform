import { API } from 'aws-amplify';

// API name from Amplify configuration
const API_NAME = 'api';

/**
 * Get all notifications for the current user
 * @returns {Promise<Array>} - List of notifications
 */
export const getNotifications = async () => API.get(API_NAME, '/notifications');

/**
 * Mark a notification as read
 * @param {string} id - Notification ID
 * @returns {Promise<Object>} - Response data
 */
export const markNotificationAsRead = async (id) => {
  try {
    const response = await API.put(API_NAME, `/notifications/${id}/read`);
    return response;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 * @returns {Promise<Object>} - Response data
 */
export const markAllNotificationsAsRead = async () => {
  try {
    const response = await API.put(API_NAME, '/notifications/read-all');
    return response;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Delete a notification
 * @param {string} id - Notification ID
 * @returns {Promise<Object>} - Response data
 */
export const deleteNotification = async (id) => {
  try {
    const response = await API.del(API_NAME, `/notifications/${id}`);
    return response;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Clear all notifications
 * @returns {Promise<Object>} - Response data
 */
export const clearAllNotifications = async () => API.post(API_NAME, '/notifications/clear');

/**
 * Get unread notification count
 * @returns {Promise<number>} - Unread notification count
 */
export const getUnreadNotificationCount = async () => {
  try {
    const response = await API.get(API_NAME, '/notifications/count');
    return response.count || 0;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    throw error;
  }
};

export const markNotificationRead = async (notificationId) =>
  API.post(API_NAME, '/notifications/mark-read', { body: { notificationId } });

export const clearNotifications = async () => API.post(API_NAME, '/notifications/clear'); 