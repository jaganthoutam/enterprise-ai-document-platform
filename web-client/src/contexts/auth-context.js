import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import { jwtDecode } from 'jwt-decode';

// Create authentication context
const AuthContext = createContext();

/**
 * AuthProvider component for managing authentication state
 * Provides login, logout, and token refresh functionality
 */
export const AuthProvider = ({ children }) => {
  // State for authentication
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState({
    accessToken: null,
    idToken: null,
    refreshToken: null,
    expiresAt: null,
  });

  // Initialize auth state from local storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedTokens = JSON.parse(localStorage.getItem('auth_tokens'));
        
        if (storedTokens && storedTokens.accessToken) {
          // Check if token is expired
          const expiresAt = storedTokens.expiresAt;
          const isExpired = expiresAt && new Date().getTime() > expiresAt;
          
          if (isExpired && storedTokens.refreshToken) {
            // Token is expired, try to refresh
            await refreshTokens(storedTokens.refreshToken);
          } else if (!isExpired) {
            // Token is still valid
            setTokens(storedTokens);
            setIsAuthenticated(true);
            
            // Decode token to get user information
            const decodedToken = jwtDecode(storedTokens.idToken);
            
            setCurrentUser({
              username: decodedToken['cognito:username'],
              email: decodedToken.email,
              sub: decodedToken.sub,
              givenName: decodedToken.given_name,
              familyName: decodedToken.family_name,
            });
            
            setUserRole(decodedToken['custom:role'] || 'user');
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    let refreshInterval;
    
    if (isAuthenticated && tokens.refreshToken) {
      // Calculate time to refresh (5 minutes before expiry)
      const expiresAt = tokens.expiresAt;
      const timeToRefresh = expiresAt - new Date().getTime() - (5 * 60 * 1000);
      
      // Set up refresh timer
      refreshInterval = setTimeout(() => {
        refreshTokens(tokens.refreshToken);
      }, Math.max(timeToRefresh, 0));
    }
    
    return () => {
      if (refreshInterval) {
        clearTimeout(refreshInterval);
      }
    };
  }, [isAuthenticated, tokens]);

  /**
   * Login function
   * @param {string} username - User's username
   * @param {string} password - User's password
   * @returns {Object} - User data
   */
  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      
      if (response.data.tokens) {
        const { accessToken, idToken, refreshToken, expiresIn } = response.data.tokens;
        
        // Calculate expiry time
        const expiresAt = new Date().getTime() + (expiresIn * 1000);
        
        // Store tokens
        const tokenData = {
          accessToken,
          idToken,
          refreshToken,
          expiresAt,
        };
        
        setTokens(tokenData);
        localStorage.setItem('auth_tokens', JSON.stringify(tokenData));
        
        // Set user data
        setCurrentUser(response.data.user);
        setUserRole(response.data.user.role || 'user');
        setIsAuthenticated(true);
        
        // Configure API with new token
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        
        return response.data.user;
      }
      
      throw new Error('Login failed - no tokens received');
    } catch (error) {
      console.error('Password reset failed:', error);
      
      if (error.response) {
        const errorMessage = error.response.data.message || 'Password reset failed';
        throw new Error(errorMessage);
      }
      
      throw error;
    }
  };

  /**
   * Refresh authentication tokens
   * @param {string} refreshToken - Refresh token
   */
  const refreshTokens = async (refreshToken) => {
    try {
      const response = await api.post('/auth/token', { refreshToken });
      
      if (response.data.tokens) {
        const { accessToken, idToken, expiresIn } = response.data.tokens;
        
        // Calculate expiry time
        const expiresAt = new Date().getTime() + (expiresIn * 1000);
        
        // Update tokens
        const tokenData = {
          ...tokens,
          accessToken,
          idToken,
          expiresAt,
        };
        
        setTokens(tokenData);
        localStorage.setItem('auth_tokens', JSON.stringify(tokenData));
        
        // Configure API with new token
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      } else {
        // If token refresh fails, log out
        logout();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If token refresh fails, log out
      logout();
    }
  };

  /**
   * Logout function - clear tokens and user data
   */
  const logout = () => {
    // Clear tokens
    setTokens({
      accessToken: null,
      idToken: null,
      refreshToken: null,
      expiresAt: null,
    });
    
    // Clear user data
    setCurrentUser(null);
    setUserRole(null);
    setIsAuthenticated(false);
    
    // Remove from local storage
    localStorage.removeItem('auth_tokens');
    
    // Clear API header
    delete api.defaults.headers.common['Authorization'];
  };

  /**
   * Check if user has specific role
   * @param {string|Array} roles - Required role(s)
   * @returns {boolean} - True if user has required role
   */
  const hasRole = (roles) => {
    if (!isAuthenticated || !userRole) {
      return false;
    }
    
    if (Array.isArray(roles)) {
      return roles.includes(userRole);
    }
    
    return roles === userRole;
  };

  /**
   * Get current authentication token
   * @returns {string|null} - Current access token
   */
  const getAccessToken = () => {
    return tokens.accessToken;
  };

  // Context value
  const value = {
    currentUser,
    isAuthenticated,
    userRole,
    loading,
    login,
    logout,
    register,
    verifyAccount,
    resetPassword,
    hasRole,
    getAccessToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook for using auth context
 * @returns {Object} - Auth context
 */
export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthContext;('Login failed:', error);
      
      if (error.response) {
        const errorMessage = error.response.data.message || 'Authentication failed';
        const errorType = error.response.data.type;
        
        throw new Error(errorType || errorMessage);
      }
      
      throw error;
    }
  };

  /**
   * Register function
   * @param {string} username - User's username
   * @param {string} password - User's password
   * @param {string} email - User's email
   * @param {Object} userData - Additional user data
   * @returns {Object} - Registration result
   */
  const register = async (username, password, email, userData = {}) => {
    try {
      const response = await api.post('/auth/register', {
        username,
        password,
        email,
        ...userData,
      });
      
      return response.data;
    } catch (error) {
      console.error('Registration failed:', error);
      
      if (error.response) {
        const errorMessage = error.response.data.message || 'Registration failed';
        throw new Error(errorMessage);
      }
      
      throw error;
    }
  };

  /**
   * Verify user's account
   * @param {string} username - User's username
   * @param {string} code - Verification code
   * @returns {Object} - Verification result
   */
  const verifyAccount = async (username, code) => {
    try {
      const response = await api.post('/auth/verify', {
        username,
        code,
      });
      
      return response.data;
    } catch (error) {
      console.error('Verification failed:', error);
      
      if (error.response) {
        const errorMessage = error.response.data.message || 'Verification failed';
        throw new Error(errorMessage);
      }
      
      throw error;
    }
  };

  /**
   * Reset password
   * @param {string} username - User's username
   * @param {string} code - Reset code (optional)
   * @param {string} newPassword - New password (optional)
   * @returns {Object} - Password reset result
   */
  const resetPassword = async (username, code = null, newPassword = null) => {
    try {
      // If code and newPassword are provided, confirm reset
      // Otherwise, request reset code
      const payload = { username };
      
      if (code && newPassword) {
        payload.code = code;
        payload.password = newPassword;
      }
      
      const response = await api.post('/auth/reset-password', payload);
      
      return response.data;
    } catch (error) {
      console.error