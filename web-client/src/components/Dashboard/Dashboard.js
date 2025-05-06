import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  Button
} from '@mui/material';
import { 
  Description as DocumentIcon,
  Psychology as AIIcon,
  Storage as StorageIcon,
  People as UsersIcon
} from '@mui/icons-material';
import { documentAPI, aiAPI, dataAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import DocumentList from '../Documents/DocumentList';
import ApprovalList from '../Approvals/ApprovalList';
import AnalysisList from '../AI/AnalysisList';

/**
 * Dashboard component for showing overall metrics and recent items
 */
const Dashboard = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    documentCount: 0,
    aiAnalysisUsagePercent: 0,
    storageUsed: { value: 0, unit: 'MB', max: 0 },
    activeUsers: 0
  });
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [error, setError] = useState(null);

  // Fetch dashboard data on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch statistics
        const statsResponse = await dataAPI.getStatistics();
        if (statsResponse.data) {
          setStats(statsResponse.data);
        }
        
        // Fetch recent documents
        const docsResponse = await documentAPI.getDocuments({
          limit: 4,
          sort: 'updatedAt:desc'
        });
        if (docsResponse.data && docsResponse.data.documents) {
          setRecentDocuments(docsResponse.data.documents);
        }
        
        // Fetch pending approvals
        const approvalsResponse = await documentAPI.getDocuments({
          status: 'pending_approval',
          limit: 5
        });
        if (approvalsResponse.data && approvalsResponse.data.documents) {
          setPendingApprovals(approvalsResponse.data.documents);
        }
        
        // Fetch recent AI analyses
        const analysesResponse = await aiAPI.getAnalyses({
          limit: 3
        });
        if (analysesResponse.data && analysesResponse.data.results) {
          setRecentAnalyses(analysesResponse.data.results);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <Typography color="error" variant="h6">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box display="flex" alignItems="center" mb={1}>
              <Box sx={{ bgcolor: 'primary.light', borderRadius: '50%', p: 1, mr: 1, opacity: 0.2 }}>
                <DocumentIcon color="primary" />
              </Box>
              <Typography color="textSecondary" variant="subtitle2">Documents</Typography>
            </Box>
            <Typography variant="h4" fontWeight="bold" color="textPrimary">
              {stats.documentCount.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box display="flex" alignItems="center" mb={1}>
              <Box sx={{ bgcolor: 'success.light', borderRadius: '50%', p: 1, mr: 1, opacity: 0.2 }}>
                <AIIcon color="success" />
              </Box>
              <Typography color="textSecondary" variant="subtitle2">AI Analyses</Typography>
            </Box>
            <Typography variant="h4" fontWeight="bold" color="textPrimary">
              {stats.aiAnalysisUsagePercent}%
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box display="flex" alignItems="center" mb={1}>
              <Box sx={{ bgcolor: 'error.light', borderRadius: '50%', p: 1, mr: 1, opacity: 0.2 }}>
                <StorageIcon color="error" />
              </Box>
              <Typography color="textSecondary" variant="subtitle2">Storage Used</Typography>
            </Box>
            <Typography variant="h4" fontWeight="bold" color="textPrimary">
              {stats.storageUsed.value} {stats.storageUsed.unit}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              of {stats.storageUsed.max} GB
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box display="flex" alignItems="center" mb={1}>
              <Box sx={{ bgcolor: 'secondary.light', borderRadius: '50%', p: 1, mr: 1, opacity: 0.2 }}>
                <UsersIcon color="secondary" />
              </Box>
              <Typography color="textSecondary" variant="subtitle2">Active Users</Typography>
            </Box>
            <Typography variant="h4" fontWeight="bold" color="textPrimary">
              {stats.activeUsers}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Recent Documents */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', minHeight: '350px' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight="bold">Recent Documents</Typography>
              <Button variant="text" color="primary" href="/documents">View All</Button>
            </Box>
            
            {recentDocuments.length > 0 ? (
              <List>
                {recentDocuments.map((doc) => (
                  <React.Fragment key={doc.id}>
                    <ListItem button component="a" href={`/documents/${doc.id}`}>
                      <ListItemIcon>
                        {getDocumentIcon(doc.docType)}
                      </ListItemIcon>
                      <ListItemText 
                        primary={doc.title} 
                        secondary={`${doc.docType} • ${formatDate(doc.updatedAt)}`} 
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height="250px">
                <Typography color="textSecondary">No documents found</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Pending Approvals */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', minHeight: '350px' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight="bold">Pending Approvals</Typography>
              <Button variant="text" color="primary" href="/approvals">View All</Button>
            </Box>
            
            {pendingApprovals.length > 0 ? (
              <List>
                {pendingApprovals.map((doc) => (
                  <React.Fragment key={doc.id}>
                    <ListItem 
                      button 
                      component="a" 
                      href={`/approvals/${doc.id}`}
                      secondaryAction={
                        <Box>
                          <Button 
                            variant="contained" 
                            color="success" 
                            size="small" 
                            sx={{ minWidth: 0, mr: 1 }}
                          >
                            ✓
                          </Button>
                          <Button 
                            variant="contained" 
                            color="error" 
                            size="small" 
                            sx={{ minWidth: 0 }}
                          >
                            ✕
                          </Button>
                        </Box>
                      }
                    >
                      <ListItemText 
                        primary={doc.title} 
                        secondary={`${doc.docType} • ${doc.createdByName}`} 
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height="250px">
                <Typography color="textSecondary">No pending approvals</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Recent AI Analyses */}
      <Grid container spacing={3} mt={3}>
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight="bold">Recent AI Analyses</Typography>
              <Button variant="text" color="primary" href="/ai-analyses">View All</Button>
            </Box>
            
            {recentAnalyses.length > 0 ? (
              <List>
                {recentAnalyses.map((analysis) => (
                  <React.Fragment key={analysis.id}>
                    <ListItem 
                      button 
                      component="a" 
                      href={`/ai-analyses/${analysis.id}`}
                    >
                      <ListItemIcon>
                        {getAnalysisIcon(analysis.analysisType)}
                      </ListItemIcon>
                      <ListItemText 
                        primary={`${analysis.documentTitle} - ${getAnalysisTypeLabel(analysis.analysisType)}`} 
                        secondary={`${formatDate(analysis.createdAt)} • ${analysis.modelId.split('-')[0]}`} 
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height="100px">
                <Typography color="textSecondary">No recent analyses</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// Helper functions
const getDocumentIcon = (docType) => {
  switch (docType) {
    case 'contract':
      return <DocumentIcon color="primary" />;
    case 'report':
      return <DocumentIcon color="info" />;
    case 'presentation':
      return <DocumentIcon color="success" />;
    default:
      return <DocumentIcon />;
  }
};

const getAnalysisIcon = (analysisType) => {
  switch (analysisType) {
    case 'summary':
      return <AIIcon color="primary" />;
    case 'entities':
      return <AIIcon color="success" />;
    case 'sentiment':
      return <AIIcon color="error" />;
    default:
      return <AIIcon />;
  }
};

const getAnalysisTypeLabel = (analysisType) => {
  switch (analysisType) {
    case 'summary':
      return 'Summary';
    case 'entities':
      return 'Entity Extraction';
    case 'sentiment':
      return 'Sentiment Analysis';
    case 'custom':
      return 'Custom Analysis';
    default:
      return analysisType;
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default Dashboard;