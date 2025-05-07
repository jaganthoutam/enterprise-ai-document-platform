import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Container, 
  Paper, 
  Grid, 
  Link, 
  Alert, 
  CircularProgress,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { forgotPassword, confirmForgotPassword } from '../api/auth';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const steps = ['Enter Email', 'Enter Verification Code', 'Set New Password'];

  const handleNext = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (activeStep === 0) {
        // Request password reset
        await forgotPassword(email);
        setSuccess('Verification code has been sent to your email.');
        setActiveStep(1);
      } else if (activeStep === 1) {
        // Validate code
        if (!code) {
          setError('Please enter the verification code.');
          setLoading(false);
          return;
        }
        setActiveStep(2);
      } else if (activeStep === 2) {
        // Validate passwords
        if (newPassword !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        
        if (newPassword.length < 8) {
          setError('Password must be at least 8 characters long.');
          setLoading(false);
          return;
        }
        
        // Confirm password reset
        await confirmForgotPassword(email, code, newPassword);
        setSuccess('Password has been reset successfully. You can now log in with your new password.');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error) {
      console.error('Error:', error);
      
      if (error.code === 'UserNotFoundException') {
        setError('User does not exist.');
      } else if (error.code === 'InvalidParameterException') {
        setError('Invalid verification code.');
      } else if (error.code === 'ExpiredCodeException') {
        setError('Verification code has expired. Please request a new one.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    navigate('/login');
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        );
      case 1:
        return (
          <TextField
            margin="normal"
            required
            fullWidth
            id="code"
            label="Verification Code"
            name="code"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={loading}
          />
        );
      case 2:
        return (
          <>
            <TextField
              margin="normal"
              required
              fullWidth
              name="newPassword"
              label="New Password"
              type="password"
              id="newPassword"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            Reset Password
          </Typography>
          
          <Stepper activeStep={activeStep} sx={{ width: '100%', mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
              {success}
            </Alert>
          )}
          
          <Box sx={{ mt: 1, width: '100%' }}>
            {renderStepContent(activeStep)}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button
                onClick={handleCancel}
                variant="outlined"
                disabled={loading}
              >
                Cancel
              </Button>
              
              <Box>
                {activeStep > 0 && (
                  <Button
                    onClick={handleBack}
                    variant="outlined"
                    sx={{ mr: 1 }}
                    disabled={loading}
                  >
                    Back
                  </Button>
                )}
                
                <Button
                  onClick={handleNext}
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : activeStep === steps.length - 1 ? 'Reset Password' : 'Next'}
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ForgotPassword; 