import { API } from 'aws-amplify';

// API name from Amplify configuration
const API_NAME = 'api';

/**
 * Get user settings
 * @returns {Promise<Object>} - User settings
 */
export const getSettings = async () => API.get(API_NAME, '/settings');

/**
 * Update user settings
 * @param {Object} settings - Settings to update
 * @returns {Promise<Object>} - Updated settings
 */
export const updateSettings = async (settings) =>
  API.put(API_NAME, '/settings', { body: settings });

/**
 * Get notification preferences
 * @returns {Promise<Object>} - Notification preferences
 */
export const getNotificationPreferences = async () => {
  try {
    const response = await API.get(API_NAME, '/settings/notification-preferences');
    return response.data;
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    throw error;
  }
};

/**
 * Update notification preferences
 * @param {Object} preferences - Notification preferences to update
 * @returns {Promise<Object>} - Updated notification preferences
 */
export const updateNotificationPreferences = async (preferences) => {
  try {
    const response = await API.put(API_NAME, '/settings/notification-preferences', { preferences });
    return response.data;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
};

/**
 * Get system settings (admin only)
 * @returns {Promise<Object>} - System settings
 */
export const getSystemSettings = async () => {
  try {
    const response = await API.get(API_NAME, '/settings/system');
    return response.data;
  } catch (error) {
    console.error('Error getting system settings:', error);
    throw error;
  }
};

/**
 * Update system settings (admin only)
 * @param {Object} settings - System settings to update
 * @returns {Promise<Object>} - Updated system settings
 */
export const updateSystemSettings = async (settings) => {
  try {
    const response = await API.put(API_NAME, '/settings/system', { settings });
    return response.data;
  } catch (error) {
    console.error('Error updating system settings:', error);
    throw error;
  }
}; 