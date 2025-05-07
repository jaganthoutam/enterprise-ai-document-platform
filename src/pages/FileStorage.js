import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
  MenuItem,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  CreateNewFolder as NewFolderIcon,
  Upload as UploadIcon,
  MoreVert as MoreVertIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { API } from 'aws-amplify';

function FileStorage() {
  const [currentPath, setCurrentPath] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    fetchItems();
  }, [currentPath]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const path = currentPath.join('/');
      const response = await API.get('api', `/storage/list?path=${path}`);
      setItems(response.items);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching items:', error);
      setLoading(false);
    }
  };

  const handleFolderClick = (folder) => {
    setCurrentPath([...currentPath, folder.name]);
  };

  const handleBreadcrumbClick = (index) => {
    setCurrentPath(currentPath.slice(0, index + 1));
  };

  const handleMenuOpen = (event, item) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const handleCreateFolder = async () => {
    try {
      const path = [...currentPath, newFolderName].join('/');
      await API.post('api', '/storage/folder', {
        body: { path },
      });
      setOpenDialog(false);
      setNewFolderName('');
      fetchItems();
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      const path = [...currentPath, selectedItem.name].join('/');
      await API.del('api', `/storage/delete?path=${path}`);
      handleMenuClose();
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleDownload = async () => {
    if (!selectedItem) return;
    try {
      const path = [...currentPath, selectedItem.name].join('/');
      const response = await API.get('api', `/storage/download?path=${path}`);
      window.open(response.downloadUrl, '_blank');
      handleMenuClose();
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleShare = async () => {
    if (!selectedItem) return;
    try {
      const path = [...currentPath, selectedItem.name].join('/');
      const response = await API.post('api', '/storage/share', {
        body: { path },
      });
      // Handle share response (e.g., show share dialog)
      handleMenuClose();
    } catch (error) {
      console.error('Error sharing file:', error);
    }
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
        <Typography variant="h4">File Storage</Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            sx={{ mr: 2 }}
          >
            Upload
          </Button>
          <Button
            variant="outlined"
            startIcon={<NewFolderIcon />}
            onClick={() => setOpenDialog(true)}
          >
            New Folder
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }}>
          <Link
            component="button"
            variant="body1"
            onClick={() => setCurrentPath([])}
            sx={{ cursor: 'pointer' }}
          >
            Root
          </Link>
          {currentPath.map((folder, index) => (
            <Link
              key={index}
              component="button"
              variant="body1"
              onClick={() => handleBreadcrumbClick(index)}
              sx={{ cursor: 'pointer' }}
            >
              {folder}
            </Link>
          ))}
        </Breadcrumbs>

        <List>
          {items.map((item) => (
            <ListItem
              key={item.name}
              button={item.type === 'folder'}
              onClick={() => item.type === 'folder' && handleFolderClick(item)}
            >
              <ListItemIcon>
                {item.type === 'folder' ? <FolderIcon /> : <FileIcon />}
              </ListItemIcon>
              <ListItemText
                primary={item.name}
                secondary={
                  item.type === 'file'
                    ? `${(item.size / 1024 / 1024).toFixed(2)} MB`
                    : `${item.itemCount} items`
                }
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={(e) => handleMenuOpen(e, item)}
                >
                  <MoreVertIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Create Folder Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Create New Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            fullWidth
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateFolder} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Item Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleDownload}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          Download
        </MenuItem>
        <MenuItem onClick={handleShare}>
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          Share
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default FileStorage; 