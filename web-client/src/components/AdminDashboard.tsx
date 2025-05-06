import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const DashboardContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: '#f5f5f5',
  minHeight: '100vh',
}));

const MetricCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  backgroundColor: '#0052CC',
  color: 'white',
}));

const AdminDashboard: React.FC = () => {
  const tenants = [
    { name: 'ACME Corp', users: 167, storage: '3.2/5 TB', aiUsage: '78%', status: 'Active' },
    {
      name: 'Global Industries',
      users: 243,
      storage: '4.1/6 TB',
      aiUsage: '92%',
      status: 'Active',
    },
    { name: 'Apex Solutions', users: 89, storage: '1.8/3 TB', aiUsage: '45%', status: 'Active' },
    {
      name: 'Summit Enterprises',
      users: 112,
      storage: '2.3/4 TB',
      aiUsage: '63%',
      status: 'Maintenance',
    },
  ];

  const systemMetrics = [
    { label: 'API Response Time', value: '87ms avg' },
    { label: 'Function Invocations', value: '12.5M daily' },
    { label: 'Error Rate', value: '0.02%' },
    { label: 'Current System Load', value: '42%' },
  ];

  return (
    <DashboardContainer>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {systemMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <MetricCard>
              <Typography variant="h6">{metric.label}</Typography>
              <Typography variant="h4">{metric.value}</Typography>
            </MetricCard>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h5" gutterBottom>
        Tenant Overview
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tenant</TableCell>
              <TableCell>Users</TableCell>
              <TableCell>Storage</TableCell>
              <TableCell>AI Usage</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tenants.map((tenant, index) => (
              <TableRow key={index}>
                <TableCell>{tenant.name}</TableCell>
                <TableCell>{tenant.users}</TableCell>
                <TableCell>{tenant.storage}</TableCell>
                <TableCell>{tenant.aiUsage}</TableCell>
                <TableCell>{tenant.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Grid container spacing={3} sx={{ mt: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Usage Analytics
            </Typography>
            {/* Usage analytics charts would be rendered here */}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Tenant Management
            </Typography>
            {/* Tenant management controls would be rendered here */}
          </Paper>
        </Grid>
      </Grid>
    </DashboardContainer>
  );
};

export default AdminDashboard;
