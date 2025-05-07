import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { API } from 'aws-amplify';
import AnalysisResultCard from '../components/AnalysisResultCard';

function AIAnalysis() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchAnalyzedDocuments();
  }, []);

  const fetchAnalyzedDocuments = async () => {
    setLoading(true);
    try {
      const response = await API.get('api', '/documents', { queryStringParameters: { analyzed: 'true' } });
      setDocuments(response);
    } catch (error) {
      console.error('Error fetching analyzed documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAnalysis = async (doc) => {
    setSelectedDoc(doc);
    setAnalysisOpen(true);
    setAnalysis(null);
    try {
      const response = await API.get('api', `/documents/${doc.documentId}/analysis`);
      setAnalysis(response);
    } catch (error) {
      setAnalysis({ error: 'Failed to fetch analysis.' });
    }
  };

  const handleRunAnalysis = async (doc) => {
    setAnalyzing(true);
    try {
      await API.post('api', `/documents/${doc.documentId}/analyze`, { body: { analysisType: 'full' } });
      fetchAnalyzedDocuments();
    } catch (error) {
      alert('Failed to start analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>AI Analysis</Typography>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ p: 3 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Document Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.documentId}>
                    <TableCell>{doc.fileName}</TableCell>
                    <TableCell>{doc.analysisStatus || doc.status}</TableCell>
                    <TableCell>
                      <Button variant="outlined" sx={{ mr: 1 }} onClick={() => handleViewAnalysis(doc)}>View Analysis</Button>
                      <Button variant="contained" disabled={analyzing} onClick={() => handleRunAnalysis(doc)}>
                        {analyzing ? 'Analyzing...' : 'Run Analysis'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
      <Dialog open={analysisOpen} onClose={() => setAnalysisOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Analysis Results</DialogTitle>
        <DialogContent>
          {analysis ? <AnalysisResultCard analysis={analysis} /> : <CircularProgress />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnalysisOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AIAnalysis; 