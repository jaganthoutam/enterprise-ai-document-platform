import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { API } from 'aws-amplify';

function AdminDashboard() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    status: 'active',
    storageQuota: 5368709120, // 5GB
    aiUsageQuota: 1000,
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await API.get('api', '/tenants');
      setTenants(response);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setLoading(false);
    }
  };

  const handleOpenDialog = (tenant = null) => {
    if (tenant) {
      setSelectedTenant(tenant);
      setFormData({
        name: tenant.name,
        status: tenant.status,
        storageQuota: tenant.storageQuota,
        aiUsageQuota: tenant.aiUsageQuota,
      });
    } else {
      setSelectedTenant(null);
      setFormData({
        name: '',
        status: 'active',
        storageQuota: 5368709120,
        aiUsageQuota: 1000,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTenant(null);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      if (selectedTenant) {
        await API.put('api', `/tenants/${selectedTenant.tenantId}`, {
          body: formData,
        });
      } else {
        await API.post('api', '/tenants', {
          body: formData,
        });
      }
      handleCloseDialog();
      fetchTenants();
    } catch (error) {
      console.error('Error saving tenant:', error);
    }
  };

  const handleDelete = async (tenantId) => {
    if (window.confirm('Are you sure you want to delete this tenant?')) {
      try {
        await API.del('api', `/tenants/${tenantId}`);
        fetchTenants();
      } catch (error) {
        console.error('Error deleting tenant:', error);
      }
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Admin Dashboard</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Tenant
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* System Health Metrics */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Health Metrics
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="textSecondary">
                  API Response Time
                </Typography>
                <Typography variant="h4">87ms avg</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="textSecondary">
                  Function Invocations
                </Typography>
                <Typography variant="h4">12.5M daily</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="textSecondary">
                  Error Rate
                </Typography>
                <Typography variant="h4">0.02%</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="textSecondary">
                  System Load
                </Typography>
                <Typography variant="h4">42%</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Tenants Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tenants
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Tenant</TableCell>
                    <TableCell>Users</TableCell>
                    <TableCell>Storage</TableCell>
                    <TableCell>AI Usage</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.tenantId}>
                      <TableCell>{tenant.name}</TableCell>
                      <TableCell>{tenant.activeUsers || 0}</TableCell>
                      <TableCell>
                        {formatBytes(tenant.currentStorage)} / {formatBytes(tenant.storageQuota)}
                      </TableCell>
                      <TableCell>
                        {tenant.currentAiUsage} / {tenant.aiUsageQuota}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={tenant.status}
                          color={tenant.status === 'active' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(tenant)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(tenant.tenantId)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Tenant Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedTenant ? 'Edit Tenant' : 'Add New Tenant'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Tenant Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Storage Quota (bytes)"
              name="storageQuota"
              type="number"
              value={formData.storageQuota}
              onChange={handleInputChange}
              margin="normal"
            />
            <TextField
              fullWidth
              label="AI Usage Quota"
              name="aiUsageQuota"
              type="number"
              value={formData.aiUsageQuota}
              onChange={handleInputChange}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedTenant ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AdminDashboard; 