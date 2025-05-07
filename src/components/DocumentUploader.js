import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  LinearProgress,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { uploadDocument } from '../api/documents';

const DocumentUploader = ({ onUploadSuccess, onUploadError }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset states
    setError('');
    setSuccess('');
    setUploadProgress(0);

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      setError('File size exceeds 10MB limit');
      setSelectedFile(null);
      return;
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('File type not supported. Please upload PDF, Word, Excel, PowerPoint, or text files.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);

    try {
      // Create FormData object
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prevProgress) => {
          if (prevProgress >= 90) {
            clearInterval(progressInterval);
            return prevProgress;
          }
          return prevProgress + 10;
        });
      }, 500);

      // Upload document
      const response = await uploadDocument(formData);
      
      // Clear interval and set progress to 100%
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Show success message
      setSuccess('Document uploaded successfully!');
      
      // Reset file selection
      setSelectedFile(null);
      
      // Call success callback if provided
      if (onUploadSuccess) {
        onUploadSuccess(response);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      setError('Failed to upload document. Please try again.');
      
      // Call error callback if provided
      if (onUploadError) {
        onUploadError(error);
      }
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Upload Document
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={6}>
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadIcon />}
            disabled={uploading}
            fullWidth
          >
            Select File
            <input
              type="file"
              hidden
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            />
          </Button>
        </Grid>
        
        <Grid item xs={12} md={6}>
          {selectedFile ? (
            <Box>
              <Typography variant="body2" gutterBottom>
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </Typography>
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={uploading}
                fullWidth
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No file selected
            </Typography>
          )}
        </Grid>
      </Grid>
      
      {uploading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress variant="determinate" value={uploadProgress} />
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
            {uploadProgress}% Complete
          </Typography>
        </Box>
      )}
      
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Supported file types: PDF, Word, Excel, PowerPoint, Text
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Maximum file size: 10MB
      </Typography>
    </Paper>
  );
};

export default DocumentUploader; 