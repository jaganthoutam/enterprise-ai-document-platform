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
  StepLabel,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { signUp, confirmSignUp, resendConfirmationCode } from '../api/auth';

const Register = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const steps = ['Account Information', 'Personal Information', 'Verify Email'];

  const handleNext = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (activeStep === 0) {
        // Validate passwords
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        
        if (password.length < 8) {
          setError('Password must be at least 8 characters long.');
          setLoading(false);
          return;
        }
        
        setActiveStep(1);
      } else if (activeStep === 1) {
        // Validate personal information
        if (!firstName || !lastName) {
          setError('First name and last name are required.');
          setLoading(false);
          return;
        }
        
        // Sign up user
        await signUp(email, password, {
          email,
          firstName,
          lastName
        });
        
        setSuccess('Verification code has been sent to your email.');
        setActiveStep(2);
      } else if (activeStep === 2) {
        // Validate code
        if (!code) {
          setError('Please enter the verification code.');
          setLoading(false);
          return;
        }
        
        // Confirm sign up
        await confirmSignUp(email, code);
        setSuccess('Account created successfully! You can now log in.');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error) {
      console.error('Error:', error);
      
      if (error.code === 'UsernameExistsException') {
        setError('An account with this email already exists.');
      } else if (error.code === 'InvalidPasswordException') {
        setError('Password does not meet requirements.');
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

  const handleResendCode = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await resendConfirmationCode(email);
      setSuccess('A new verification code has been sent to your email.');
    } catch (error) {
      console.error('Error resending code:', error);
      setError('Failed to resend verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <>
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
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={handleToggleConfirmPasswordVisibility}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </>
        );
      case 1:
        return (
          <>
            <TextField
              margin="normal"
              required
              fullWidth
              id="firstName"
              label="First Name"
              name="firstName"
              autoComplete="given-name"
              autoFocus
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="lastName"
              label="Last Name"
              name="lastName"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={loading}
            />
          </>
        );
      case 2:
        return (
          <>
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
            <Button
              onClick={handleResendCode}
              variant="text"
              disabled={loading}
              sx={{ mt: 1 }}
            >
              Resend Code
            </Button>
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
            Create Account
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
                  {loading ? <CircularProgress size={24} /> : activeStep === steps.length - 1 ? 'Create Account' : 'Next'}
                </Button>
              </Box>
            </Box>
          </Box>
          
          <Grid container justifyContent="center" sx={{ mt: 3 }}>
            <Grid item>
              <Link href="#" variant="body2" onClick={handleCancel}>
                Already have an account? Sign in
              </Link>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register; 