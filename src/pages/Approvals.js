import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, CircularProgress, Chip } from '@mui/material';
import { API } from 'aws-amplify';
import StatusChip from '../components/StatusChip';
import ConfirmDialog from '../components/ConfirmDialog';

function Approvals() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [action, setAction] = useState('');

  useEffect(() => {
    fetchPendingDocuments();
  }, []);

  const fetchPendingDocuments = async () => {
    setLoading(true);
    try {
      const response = await API.get('api', '/documents', { queryStringParameters: { status: 'pending' } });
      setDocuments(response);
    } catch (error) {
      console.error('Error fetching pending documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (doc) => {
    setSelectedDoc(doc);
    setAction('approve');
    setConfirmOpen(true);
  };

  const handleReject = (doc) => {
    setSelectedDoc(doc);
    setAction('reject');
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedDoc) return;
    try {
      await API.put('api', `/documents/${selectedDoc.documentId}/status`, { body: { status: action === 'approve' ? 'approved' : 'rejected' } });
      fetchPendingDocuments();
    } catch (error) {
      console.error('Error updating document status:', error);
    } finally {
      setConfirmOpen(false);
      setSelectedDoc(null);
      setAction('');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Approvals</Typography>
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
                  <TableCell>Owner</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.documentId}>
                    <TableCell>{doc.fileName}</TableCell>
                    <TableCell>{doc.owner || doc.userId}</TableCell>
                    <TableCell><StatusChip status={doc.status} /></TableCell>
                    <TableCell>
                      <Button variant="contained" color="success" sx={{ mr: 1 }} onClick={() => handleApprove(doc)}>Approve</Button>
                      <Button variant="contained" color="error" onClick={() => handleReject(doc)}>Reject</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title={action === 'approve' ? 'Approve Document' : 'Reject Document'}
        content={`Are you sure you want to ${action} this document?`}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
      />
    </Box>
  );
}

export default Approvals; 