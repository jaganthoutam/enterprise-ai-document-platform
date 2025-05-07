import { API } from 'aws-amplify';

// API name from Amplify configuration
const API_NAME = 'authApi';

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {string} userData.email - User email
 * @param {string} userData.firstName - User first name
 * @param {string} userData.lastName - User last name
 * @param {string} userData.role - User role (default: 'user')
 * @param {string} userData.tenantId - Tenant ID
 * @returns {Promise<Object>} - Created user data
 */
export const createUser = async (userData) => {
  try {
    const response = await API.post(API_NAME, '/auth/users', {
      body: userData
    });
    return response;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object>} - User data
 */
export const getUser = async (email) => {
  try {
    const response = await API.get(API_NAME, `/auth/users/${email}`);
    return response.user;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

/**
 * Update user attributes
 * @param {string} email - User email
 * @param {Object} attributes - User attributes to update
 * @returns {Promise<Object>} - Response data
 */
export const updateUser = async (email, attributes) => {
  try {
    const response = await API.put(API_NAME, `/auth/users/${email}`, {
      body: attributes
    });
    return response;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Delete user
 * @param {string} email - User email
 * @returns {Promise<Object>} - Response data
 */
export const deleteUser = async (email) => {
  try {
    const response = await API.del(API_NAME, `/auth/users/${email}`);
    return response;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

/**
 * List users with pagination
 * @param {number} limit - Number of users to return
 * @param {string} paginationToken - Pagination token
 * @returns {Promise<Object>} - List of users and pagination token
 */
export const listUsers = async (limit = 20, paginationToken = null) => {
  try {
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit);
    if (paginationToken) queryParams.append('paginationToken', paginationToken);
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await API.get(API_NAME, `/auth/users${queryString}`);
    return response;
  } catch (error) {
    console.error('Error listing users:', error);
    throw error;
  }
};

/**
 * Sign in user
 * @param {string} username - Username (email)
 * @param {string} password - Password
 * @returns {Promise<Object>} - Authentication result
 */
export const signIn = async (username, password) => {
  try {
    const { Auth } = await import('aws-amplify');
    const user = await Auth.signIn(username, password);
    return user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

/**
 * Sign out user
 * @returns {Promise<void>}
 */
export const signOut = async () => {
  try {
    const { Auth } = await import('aws-amplify');
    await Auth.signOut();
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Get current authenticated user
 * @returns {Promise<Object>} - Current user data
 */
export const getCurrentUser = async () => {
  try {
    const { Auth } = await import('aws-amplify');
    const user = await Auth.currentAuthenticatedUser();
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
};

/**
 * Get current user session
 * @returns {Promise<Object>} - Current session data
 */
export const getCurrentSession = async () => {
  try {
    const { Auth } = await import('aws-amplify');
    const session = await Auth.currentSession();
    return session;
  } catch (error) {
    console.error('Error getting current session:', error);
    throw error;
  }
};

/**
 * Change password
 * @param {string} oldPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Response data
 */
export const changePassword = async (oldPassword, newPassword) => {
  try {
    const { Auth } = await import('aws-amplify');
    const user = await Auth.currentAuthenticatedUser();
    await Auth.changePassword(user, oldPassword, newPassword);
    return { success: true };
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
};

/**
 * Forgot password
 * @param {string} username - Username (email)
 * @returns {Promise<Object>} - Response data
 */
export const forgotPassword = async (username) => {
  try {
    const { Auth } = await import('aws-amplify');
    await Auth.forgotPassword(username);
    return { success: true };
  } catch (error) {
    console.error('Error initiating forgot password:', error);
    throw error;
  }
};

/**
 * Confirm forgot password
 * @param {string} username - Username (email)
 * @param {string} code - Verification code
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Response data
 */
export const confirmForgotPassword = async (username, code, newPassword) => {
  try {
    const { Auth } = await import('aws-amplify');
    await Auth.forgotPasswordSubmit(username, code, newPassword);
    return { success: true };
  } catch (error) {
    console.error('Error confirming forgot password:', error);
    throw error;
  }
};

/**
 * Sign up a new user
 * @param {string} username - Username (email)
 * @param {string} password - Password
 * @param {Object} attributes - User attributes
 * @param {string} attributes.email - User email
 * @param {string} attributes.firstName - User first name
 * @param {string} attributes.lastName - User last name
 * @returns {Promise<Object>} - Sign up result
 */
export const signUp = async (username, password, attributes) => {
  try {
    const { Auth } = await import('aws-amplify');
    const result = await Auth.signUp({
      username,
      password,
      attributes
    });
    return result;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

/**
 * Confirm sign up
 * @param {string} username - Username (email)
 * @param {string} code - Confirmation code
 * @returns {Promise<Object>} - Confirmation result
 */
export const confirmSignUp = async (username, code) => {
  try {
    const { Auth } = await import('aws-amplify');
    const result = await Auth.confirmSignUp(username, code);
    return result;
  } catch (error) {
    console.error('Error confirming sign up:', error);
    throw error;
  }
};

/**
 * Resend confirmation code
 * @param {string} username - Username (email)
 * @returns {Promise<Object>} - Resend result
 */
export const resendConfirmationCode = async (username) => {
  try {
    const { Auth } = await import('aws-amplify');
    const result = await Auth.resendSignUp(username);
    return result;
  } catch (error) {
    console.error('Error resending confirmation code:', error);
    throw error;
  }
}; 