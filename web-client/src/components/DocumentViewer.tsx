import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const ViewerContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  height: '100vh',
  backgroundColor: '#f5f5f5',
}));

const DocumentContent = styled(Paper)(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(3),
  margin: theme.spacing(2),
  overflow: 'auto',
}));

const AnalysisPanel = styled(Paper)(({ theme }) => ({
  width: '300px',
  padding: theme.spacing(2),
  margin: theme.spacing(2),
  backgroundColor: '#f8f9fa',
}));

const DocumentViewer: React.FC = () => {
  const documentSummary = {
    title: 'ACME Services Agreement',
    summary:
      'This agreement outlines the terms of service between ACME Corporation and the client, including service level requirements, payment terms, confidentiality provisions, and termination conditions.',
    keyTerms: [
      { term: 'Term', value: '24 months with auto-renewal' },
      { term: 'Payment', value: 'Net 30 days' },
      { term: 'Early termination fee', value: '20% of remaining contract value' },
      { term: 'Confidentiality', value: '5-year NDA from termination' },
    ],
    metadata: {
      created: 'May 1, 2025',
      lastModified: 'May 5, 2025',
      status: 'Pending approval',
      classification: 'Confidential',
    },
  };

  return (
    <ViewerContainer>
      <DocumentContent>
        <Typography variant="h4" gutterBottom>
          {documentSummary.title}
        </Typography>
        <Typography variant="body1" paragraph>
          {documentSummary.summary}
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          Document Content
        </Typography>
        {/* Document content would be rendered here */}
      </DocumentContent>

      <AnalysisPanel>
        <Typography variant="h6" gutterBottom>
          AI Analysis
        </Typography>
        <Typography variant="body2" paragraph>
          {documentSummary.summary}
        </Typography>

        <Typography variant="subtitle1" gutterBottom>
          Key Terms
        </Typography>
        <List dense>
          {documentSummary.keyTerms.map((term, index) => (
            <ListItem key={index}>
              <ListItemText primary={term.term} secondary={term.value} />
            </ListItem>
          ))}
        </List>

        <Typography variant="subtitle1" gutterBottom>
          Document Metadata
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Created" secondary={documentSummary.metadata.created} />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Last Modified"
              secondary={documentSummary.metadata.lastModified}
            />
          </ListItem>
          <ListItem>
            <ListItemText primary="Status" secondary={documentSummary.metadata.status} />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Classification"
              secondary={documentSummary.metadata.classification}
            />
          </ListItem>
        </List>

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button variant="contained" color="primary">
            Download
          </Button>
          <Button variant="contained" color="secondary">
            Share
          </Button>
          <Button variant="contained">Request Approval</Button>
          <Button variant="contained">Run AI Analysis</Button>
        </Box>
      </AnalysisPanel>
    </ViewerContainer>
  );
};

export default DocumentViewer;
