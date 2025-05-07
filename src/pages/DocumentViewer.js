import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Divider,
  Chip,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Share as ShareIcon,
  CheckCircle as CheckCircleIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { API } from 'aws-amplify';

function DocumentViewer() {
  const { documentId } = useParams();
  const [document, setDocument] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await API.get('api', `/documents/${documentId}`);
        setDocument(response);
        if (response.analysisResults) {
          setAnalysis(response.analysisResults);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching document:', error);
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId]);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDownload = async () => {
    try {
      const response = await API.get('api', `/documents/${documentId}/download`);
      window.open(response.downloadUrl, '_blank');
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const handleShare = () => {
    // Implement share functionality
    handleMenuClose();
  };

  const handleApprove = () => {
    // Implement approval functionality
    handleMenuClose();
  };

  const runAnalysis = async (analysisType) => {
    try {
      setLoading(true);
      const response = await API.post('api', '/documents/analyze', {
        body: {
          documentId,
          analysisType,
        },
      });
      setAnalysis(response);
      setLoading(false);
    } catch (error) {
      console.error('Error running analysis:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!document) {
    return (
      <Box>
        <Typography variant="h6">Document not found</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">{document.fileName}</Typography>
        <Box>
          <IconButton onClick={handleDownload}>
            <DownloadIcon />
          </IconButton>
          <IconButton onClick={handleShare}>
            <ShareIcon />
          </IconButton>
          <IconButton onClick={handleMenuOpen}>
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleApprove}>
              <CheckCircleIcon sx={{ mr: 1 }} />
              Approve Document
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Document Content */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Document Content
            </Typography>
            <Box
              sx={{
                height: '60vh',
                overflow: 'auto',
                border: '1px solid #e0e0e0',
                p: 2,
                borderRadius: 1,
              }}
            >
              {/* Document content would be rendered here */}
              <Typography variant="body1">
                {document.content || 'Document content not available'}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* AI Analysis Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              AI Analysis
            </Typography>
            <Box mb={2}>
              <Button
                variant="contained"
                onClick={() => runAnalysis('summary')}
                sx={{ mr: 1 }}
              >
                Summary
              </Button>
              <Button
                variant="contained"
                onClick={() => runAnalysis('key_terms')}
                sx={{ mr: 1 }}
              >
                Key Terms
              </Button>
              <Button
                variant="contained"
                onClick={() => runAnalysis('risk_assessment')}
              >
                Risk Assessment
              </Button>
            </Box>

            {analysis && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  {analysis.type === 'summary' && 'Document Summary'}
                  {analysis.type === 'key_terms' && 'Key Terms'}
                  {analysis.type === 'risk_assessment' && 'Risk Assessment'}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body1">
                  {analysis.content}
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block" mt={2}>
                  Last analyzed: {new Date(analysis.timestamp).toLocaleString()}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Document Metadata */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Document Metadata
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(document.uploadDate).toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Modified
                </Typography>
                <Typography variant="body2">
                  {new Date(document.uploadDate).toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Status
                </Typography>
                <Chip
                  label={document.status}
                  color={document.status === 'approved' ? 'success' : 'warning'}
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Classification
                </Typography>
                <Chip
                  label={document.classification || 'Standard'}
                  size="small"
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default DocumentViewer; 