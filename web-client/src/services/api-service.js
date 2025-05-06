import axios from 'axios';

/**
 * API service for making HTTP requests to the backend
 * Configures Axios with base URL, default headers, and interceptors
 */

// Get API URL from environment variables
const API_URL = process.env.REACT_APP_API_ENDPOINT || 'https://api-dev.example.com';

// Create Axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

/**
 * Request interceptor
 * Add authentication token to requests if available
 */
api.interceptors.request.use(
  (config) => {
    // Get tokens from local storage
    const authTokens = JSON.parse(localStorage.getItem('auth_tokens'));
    
    // Add Authorization header if access token exists
    if (authTokens && authTokens.accessToken) {
      config.headers.Authorization = `Bearer ${authTokens.accessToken}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor
 * Handle common response errors and token refresh
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized error (token expired)
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      
      try {
        // Get refresh token from local storage
        const authTokens = JSON.parse(localStorage.getItem('auth_tokens'));
        
        if (authTokens && authTokens.refreshToken) {
          // Call token refresh endpoint
          const response = await axios.post(`${API_URL}/auth/token`, {
            refreshToken: authTokens.refreshToken,
          });
          
          // Update tokens in local storage
          if (response.data.tokens) {
            const { accessToken, idToken, expiresIn } = response.data.tokens;
            const expiresAt = new Date().getTime() + (expiresIn * 1000);
            
            const updatedTokens = {
              ...authTokens,
              accessToken,
              idToken,
              expiresAt,
            };
            
            localStorage.setItem('auth_tokens', JSON.stringify(updatedTokens));
            
            // Update the original request's Authorization header
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            
            // Retry the original request
            return axios(originalRequest);
          }
        }
        
        // If token refresh fails, redirect to login
        window.location.href = '/login?session=expired';
        return Promise.reject(error);
      } catch (refreshError) {
        // Token refresh failed, redirect to login
        localStorage.removeItem('auth_tokens');
        window.location.href = '/login?session=expired';
        return Promise.reject(refreshError);
      }
    }
    
    // Handle 403 Forbidden error
    if (error.response && error.response.status === 403) {
      console.error('Access forbidden:', error.response.data);
    }
    
    // Handle 404 Not Found error
    if (error.response && error.response.status === 404) {
      console.error('Resource not found:', error.response.data);
    }
    
    // Handle 500 Server error
    if (error.response && error.response.status >= 500) {
      console.error('Server error:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

/**
 * API methods for authentication
 */
export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  register: (userData) => api.post('/auth/register', userData),
  verifyAccount: (username, code) => api.post('/auth/verify', { username, code }),
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
  refreshToken: (refreshToken) => api.post('/auth/token', { refreshToken }),
};

/**
 * API methods for user management
 */
export const userAPI = {
  getCurrentUser: () => api.get('/users/me'),
  updateProfile: (userData) => api.put('/users/me', userData),
  changePassword: (oldPassword, newPassword) => 
    api.post('/users/me/change-password', { oldPassword, newPassword }),
  getUsers: (params) => api.get('/users', { params }),
  getUserById: (userId) => api.get(`/users/${userId}`),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (userId, userData) => api.put(`/users/${userId}`, userData),
  deleteUser: (userId) => api.delete(`/users/${userId}`),
};

/**
 * API methods for document management
 */
export const documentAPI = {
  getDocuments: (params) => api.get('/documents', { params }),
  getDocumentById: (documentId) => api.get(`/documents/${documentId}`),
  createDocument: (documentData) => api.post('/documents', documentData),
  updateDocument: (documentId, documentData) => api.put(`/documents/${documentId}`, documentData),
  deleteDocument: (documentId) => api.delete(`/documents/${documentId}`),
  uploadDocument: (formData, onUploadProgress) => 
    api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    }),
};

/**
 * API methods for AI services
 */
export const aiAPI = {
  chatWithAI: (messages) => api.post('/ai/chat', { messages }),
  analyzeDocument: (documentId, options) => 
    api.post('/ai/analyze', { documentId, options }),
  searchKnowledgeBase: (query, filters) => 
    api.post('/ai/search', { query, filters }),
};

/**
 * API methods for data access
 */
export const dataAPI = {
  getStatistics: (params) => api.get('/data/statistics', { params }),
  getReports: (params) => api.get('/data/reports', { params }),
  exportData: (exportConfig) => api.post('/data/export', exportConfig, {
    responseType: 'blob',
  }),
};

// Export default API instance
export default api;
