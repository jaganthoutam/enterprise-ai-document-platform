import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Description as DocumentIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  HourglassEmpty as HourglassIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { API } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import { uploadDocument, getDocuments, deleteDocument, getDocumentAnalysis, analyzeDocument, downloadDocument } from '../api/documents';
import DocumentUploader from '../components/DocumentUploader';
import AnalysisResultCard from '../components/AnalysisResultCard';
import ConfirmDialog from '../components/ConfirmDialog';

const DocumentAnalysis = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [analysisResults, setAnalysisResults] = useState({});
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await getDocuments();
      setDocuments(response.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Failed to fetch documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (data) => {
    setSuccess('Document uploaded successfully!');
    fetchDocuments();
  };

  const handleUploadError = (error) => {
    console.error('Error uploading document:', error);
    setError('Failed to upload document. Please try again.');
  };

  const handleDeleteClick = (documentId) => {
    setDocumentToDelete(documentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;
    
    try {
      await deleteDocument(documentToDelete);
      setSuccess('Document deleted successfully!');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Failed to delete document. Please try again.');
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  const handleAnalyze = async (documentId) => {
    setAnalysisLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await analyzeDocument(documentId);
      setAnalysisResults(result);
      setSelectedDocument(documentId);
      setAnalysisDialogOpen(true);
    } catch (error) {
      console.error('Error analyzing document:', error);
      setError('Failed to analyze document. Please try again.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleViewAnalysis = async (documentId) => {
    setAnalysisLoading(true);
    try {
      const result = await getDocumentAnalysis(documentId);
      setAnalysisResults(result);
      setSelectedDocument(documentId);
      setAnalysisDialogOpen(true);
    } catch (error) {
      console.error('Error fetching analysis:', error);
      setError('Failed to fetch analysis. Please try again.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleCloseAnalysisDialog = () => {
    setAnalysisDialogOpen(false);
  };

  const handleDownload = async (documentId, fileName) => {
    setDownloadLoading(true);
    try {
      const blob = await downloadDocument(documentId);
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      setSuccess('Document downloaded successfully!');
    } catch (error) {
      console.error('Error downloading document:', error);
      setError('Failed to download document. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fileType.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const sortedAndFilteredDocuments = [...filteredDocuments].sort((a, b) => {
    const dateA = new Date(a.uploadDate);
    const dateB = new Date(b.uploadDate);
    
    return sortOrder === 'newest' 
      ? dateB - dateA 
      : dateA - dateB;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'processing':
        return <CircularProgress size={20} />;
      default:
        return <WarningIcon color="warning" />;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Document Analysis
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

      <DocumentUploader 
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
      />

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}>
            <Box display="flex" alignItems="center">
              <Typography variant="h6" sx={{ mr: 2 }}>
                Your Documents
              </Typography>
              <Tooltip title="Refresh documents">
                <IconButton 
                  onClick={fetchDocuments} 
                  disabled={loading}
                  color="primary"
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
        </Grid>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Filter by status:
          </Typography>
          <Box display="flex" gap={1}>
            <Chip
              label="All"
              onClick={() => setStatusFilter('all')}
              color={statusFilter === 'all' ? 'primary' : 'default'}
              variant={statusFilter === 'all' ? 'filled' : 'outlined'}
            />
            <Chip
              label="Completed"
              onClick={() => setStatusFilter('completed')}
              color={statusFilter === 'completed' ? 'primary' : 'default'}
              variant={statusFilter === 'completed' ? 'filled' : 'outlined'}
              icon={<CheckCircleIcon />}
            />
            <Chip
              label="Processing"
              onClick={() => setStatusFilter('processing')}
              color={statusFilter === 'processing' ? 'primary' : 'default'}
              variant={statusFilter === 'processing' ? 'filled' : 'outlined'}
              icon={<HourglassIcon />}
            />
            <Chip
              label="Failed"
              onClick={() => setStatusFilter('failed')}
              color={statusFilter === 'failed' ? 'primary' : 'default'}
              variant={statusFilter === 'failed' ? 'filled' : 'outlined'}
              icon={<ErrorIcon />}
            />
          </Box>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Sort by:
          </Typography>
          <Box display="flex" gap={1}>
            <Chip
              label="Newest First"
              onClick={() => setSortOrder('newest')}
              color={sortOrder === 'newest' ? 'primary' : 'default'}
              variant={sortOrder === 'newest' ? 'filled' : 'outlined'}
            />
            <Chip
              label="Oldest First"
              onClick={() => setSortOrder('oldest')}
              color={sortOrder === 'oldest' ? 'primary' : 'default'}
              variant={sortOrder === 'oldest' ? 'filled' : 'outlined'}
            />
          </Box>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : sortedAndFilteredDocuments.length === 0 ? (
          <Box p={3} textAlign="center">
            <Typography variant="body1" color="text.secondary">
              No documents found. Upload a document to get started.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {sortedAndFilteredDocuments.map((doc) => (
              <Grid item xs={12} sm={6} md={4} key={doc.documentId}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <DocumentIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" noWrap>
                        {doc.fileName}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Type: {doc.fileType}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
                    </Typography>
                    <Box display="flex" alignItems="center" mt={1}>
                      <Typography variant="body2" sx={{ mr: 1 }}>
                        Status:
                      </Typography>
                      <Chip
                        size="small"
                        icon={getStatusIcon(doc.status)}
                        label={doc.status}
                        color={
                          doc.status === 'completed'
                            ? 'success'
                            : doc.status === 'failed'
                            ? 'error'
                            : 'default'
                        }
                      />
                    </Box>
                  </CardContent>
                  <Divider />
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<InfoIcon />}
                      onClick={() => handleViewAnalysis(doc.documentId)}
                      disabled={doc.status !== 'completed'}
                    >
                      View Analysis
                    </Button>
                    <Button
                      size="small"
                      startIcon={<SearchIcon />}
                      onClick={() => handleAnalyze(doc.documentId)}
                      disabled={doc.status === 'processing'}
                    >
                      Analyze
                    </Button>
                    <Button
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownload(doc.documentId, doc.fileName)}
                      disabled={downloadLoading}
                    >
                      Download
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteClick(doc.documentId)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Document"
        content="Are you sure you want to delete this document? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {/* Analysis Results Dialog */}
      <Dialog
        open={analysisDialogOpen}
        onClose={handleCloseAnalysisDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Document Analysis Results
          {selectedDocument && (
            <Typography variant="subtitle2" color="text.secondary">
              {documents.find(d => d.documentId === selectedDocument)?.fileName}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {analysisLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : analysisResults ? (
            <AnalysisResultCard result={analysisResults} />
          ) : (
            <Typography>No analysis results available.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAnalysisDialog}>Close</Button>
          <Button
            variant="contained"
            onClick={() => navigate('/ai-assistant')}
          >
            Ask AI Assistant
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentAnalysis; 