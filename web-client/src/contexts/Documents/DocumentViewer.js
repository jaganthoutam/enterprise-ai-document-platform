import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Divider, 
  Button, 
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
  Chip
} from '@mui/material';
import {
  Download as DownloadIcon,
  Share as ShareIcon,
  Search as SearchIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { documentAPI, aiAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import DocumentContent from './DocumentContent';
import AnalysisPanel from '../AI/AnalysisPanel';

/**
 * Document viewer component
 * Shows document content and AI analysis panel
 */
const DocumentViewer = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // States
  const [document, setDocument] = useState(null);
  const [documentContent, setDocumentContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisType, setAnalysisType] = useState('summary');
  const [analysis, setAnalysis] = useState(null);
  
  // Fetch document on component mount
  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        
        // Get document metadata
        const response = await documentAPI.getDocumentById(documentId);
        
        if (response.data) {
          setDocument(response.data);
          
          // Get document content if available
          if (response.data.downloadUrl) {
            const contentResponse = await fetch(response.data.downloadUrl);
            const content = await contentResponse.text();
            setDocumentContent(content);
          }
          
          // Get latest analysis if available
          fetchLatestAnalysis(documentId);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching document:', err);
        setError('Failed to load document');
        setLoading(false);
      }
    };
    
    if (documentId) {
      fetchDocument();
    }
  }, [documentId]);
  
  // Fetch latest analysis for the document
  const fetchLatestAnalysis = async (docId) => {
    try {
      const response = await aiAPI.getAnalyses({
        documentId: docId,
        limit: 1,
        sort: 'createdAt:desc'
      });
      
      if (response.data && response.data.results && response.data.results.length > 0) {
        setAnalysis(response.data.results[0]);
        setAnalysisType(response.data.results[0].analysisType);
      }
    } catch (err) {
      console.error('Error fetching analysis:', err);
      // Do not set error state as this is not critical
    }
  };
  
  // Handle analysis type change
  const handleAnalysisTypeChange = (event, newValue) => {
    setAnalysisType(newValue);
  };
  
  // Handle analyze button click
  const handleAnalyze = async () => {
    try {
      setAnalysisLoading(true);
      
      const response = await aiAPI.analyzeDocument(documentId, {
        analysisType
      });
      
      if (response.data) {
        setAnalysis(response.data);
      }
      
      setAnalysisLoading(false);
    } catch (err) {
      console.error('Error analyzing document:', err);
      setAnalysisLoading(false);
    }
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error || !document) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <Typography color="error" variant="h6">{error || 'Document not found'}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Document Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight="bold">{document.title}</Typography>
          
          <Box>
            <IconButton aria-label="download" sx={{ mr: 1 }}>
              <DownloadIcon />
            </IconButton>
            
            <IconButton aria-label="share" sx={{ mr: 1 }}>
              <ShareIcon />
            </IconButton>
            
            <IconButton aria-label="search" sx={{ mr: 1 }}>
              <SearchIcon />
            </IconButton>
            
            <IconButton aria-label="settings" sx={{ mr: 1 }}>
              <SettingsIcon />
            </IconButton>
            
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleAnalyze}
              disabled={analysisLoading}
            >
              {analysisLoading ? 'Analyzing...' : 'Analyze'}
            </Button>
          </Box>
        </Box>
      </Paper>
      
      {/* Document Metadata */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" flexWrap="wrap">
          <Typography variant="body2" color="textSecondary" sx={{ mr: 2 }}>
            {document.docType} • {document.fileType} • {formatFileSize(document.fileSize)}
          </Typography>
          
          <Typography variant="body2" color="textSecondary" sx={{ mr: 2 }}>
            Uploaded: {formatDate(document.createdAt)}
          </Typography>
          
          <Typography variant="body2" color="textSecondary" sx={{ mr: 2 }}>
            Status: <Chip size="small" label={document.status} color={getStatusColor(document.status)} />
          </Typography>
          
          <Typography variant="body2" color="textSecondary">
            Version: {document.version}
          </Typography>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Typography variant="body2" color="textSecondary">
            Owner: {document.createdByName || 'Admin User'} • 
            Access: {document.access}
          </Typography>
        </Box>
      </Paper>
      
      {/* Main Content: Document and Analysis */}
      <Box display="flex">
        {/* Document Content */}
        <Paper 
          elevation={1} 
          sx={{ 
            p: 3, 
            width: '60%', 
            minHeight: '70vh', 
            mr: 2,
            overflowY: 'auto'
          }}
        >
          <DocumentContent 
            document={document} 
            content={documentContent} 
          />
        </Paper>
        
        {/* Analysis Panel */}
        <Paper 
          elevation={1} 
          sx={{ 
            p: 3, 
            width: '40%', 
            minHeight: '70vh',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Typography variant="h6" fontWeight="bold" mb={2}>AI Analysis</Typography>
          
          <Tabs
            value={analysisType}
            onChange={handleAnalysisTypeChange}
            aria-label="analysis tabs"
            variant="fullWidth"
            sx={{ mb: 3 }}
          >
            <Tab value="summary" label="Summary" />
            <Tab value="entities" label="Entities" />
            <Tab value="sentiment" label="Sentiment" />
            <Tab value="custom" label="More" />
          </Tabs>
          
          {analysisLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" flexGrow={1}>
              <CircularProgress />
            </Box>
          ) : (
            <AnalysisPanel 
              analysis={analysis} 
              analysisType={analysisType}
              documentId={documentId}
              onAnalyze={handleAnalyze}
            />
          )}
        </Paper>
      </Box>
    </Box>
  );
};

// Helper functions
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let size = bytes;
  
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  
  return `${size.toFixed(1)} ${units[i]}`;
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const getStatusColor = (status) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'pending':
      return 'warning';
    case 'archived':
      return 'default';
    default:
      return 'primary';
  }
};

export default DocumentViewer;