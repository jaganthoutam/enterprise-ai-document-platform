import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Alert, 
  Paper, 
  CircularProgress,
  Link
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * LoginForm component for user authentication
 * Provides form fields for username and password with validation
 */
const LoginForm = () => {
  // State for form fields and validation
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Get auth context and navigation
  const { login } = useAuth();
  const navigate = useNavigate();
  
  // Form validation
  const validateForm = () => {
    let valid = true;
    
    // Reset errors
    setUsernameError('');
    setPasswordError('');
    setLoginError('');
    
    // Validate username
    if (!username.trim()) {
      setUsernameError('Username is required');
      valid = false;
    }
    
    // Validate password
    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      valid = false;
    }
    
    return valid;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Call login function from auth context
      await login(username, password);
      
      // Navigate to dashboard on successful login
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific error types
      if (error.message === 'UserNotConfirmedException') {
        setLoginError('Please verify your account first');
        navigate(`/verify?username=${encodeURIComponent(username)}`);
      } else if (error.message === 'PasswordResetRequiredException') {
        setLoginError('You need to reset your password');
        navigate(`/reset-password?username=${encodeURIComponent(username)}`);
      } else {
        setLoginError(error.message || 'Invalid username or password');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 400, mx: 'auto', mt: 8 }}>
      <Typography variant="h5" component="h1" gutterBottom align="center">
        Sign In
      </Typography>
      
      {loginError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loginError}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          label="Username"
          variant="outlined"
          fullWidth
          margin="normal"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={!!usernameError}
          helperText={usernameError}
          disabled={loading}
          autoFocus
        />
        
        <TextField
          label="Password"
          type="password"
          variant="outlined"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={!!passwordError}
          helperText={passwordError}
          disabled={loading}
        />
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          sx={{ mt: 3, mb: 2 }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Sign In'}
        </Button>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Link 
            href="/forgot-password" 
            variant="body2"
            underline="hover"
          >
            Forgot password?
          </Link>
          
          <Link 
            href="/register" 
            variant="body2"
            underline="hover"
          >
            Don't have an account? Sign Up
          </Link>
        </Box>
      </Box>
    </Paper>
  );
};

export default LoginForm;
