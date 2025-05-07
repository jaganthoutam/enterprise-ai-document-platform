import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  CircularProgress,
  Divider,
  Menu,
  MenuItem,
  Badge,
  Tabs,
  Tab,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  MarkEmailRead as MarkEmailReadIcon,
  Circle as UnreadIcon,
  Check as CheckIcon,
  DoneAll as DoneAllIcon,
  ClearAll as ClearAllIcon,
} from '@mui/icons-material';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} from '../api/notifications';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications();
      setNotifications(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleMenuOpen = (event, notification) => {
    setAnchorEl(event.currentTarget);
    setSelectedNotification(notification);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedNotification(null);
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      setError('Failed to mark notification as read. Please try again.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setError('Failed to mark all notifications as read. Please try again.');
    }
  };

  const handleDeleteClick = (notification) => {
    setNotificationToDelete(notification);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!notificationToDelete) return;

    try {
      await deleteNotification(notificationToDelete.id);
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== notificationToDelete.id)
      );
      setDeleteDialogOpen(false);
      setNotificationToDelete(null);
    } catch (error) {
      console.error('Error deleting notification:', error);
      setError('Failed to delete notification. Please try again.');
    }
  };

  const handleClearAllClick = () => {
    setClearAllDialogOpen(true);
  };

  const handleClearAllConfirm = async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
      setClearAllDialogOpen(false);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      setError('Failed to clear all notifications. Please try again.');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'info':
        return <InfoIcon color="info" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <NotificationsIcon color="primary" />;
    }
  };

  const getNotificationChip = (type) => {
    switch (type) {
      case 'info':
        return <Chip label="Info" size="small" color="info" variant="outlined" />;
      case 'warning':
        return <Chip label="Warning" size="small" color="warning" variant="outlined" />;
      case 'error':
        return <Chip label="Error" size="small" color="error" variant="outlined" />;
      default:
        return <Chip label="Notification" size="small" color="primary" variant="outlined" />;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (tabValue === 0) return true; // All
    if (tabValue === 1) return !notification.read; // Unread
    if (tabValue === 2) return notification.read; // Read
    return true;
  });

  const unreadCount = notifications.filter(notification => !notification.read).length;
  const readCount = notifications.filter(notification => notification.read).length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
        <Button variant="contained" onClick={fetchNotifications} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Notifications
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            onClick={handleMarkAllAsRead} 
            disabled={unreadCount === 0}
            sx={{ mr: 1 }}
          >
            Mark All as Read
          </Button>
          <Button 
            variant="outlined" 
            color="error" 
            onClick={handleClearAllClick}
            disabled={notifications.length === 0}
          >
            Clear All
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab 
            label={
              <Badge badgeContent={notifications.length} color="primary">
                All
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={unreadCount} color="error">
                Unread
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={readCount} color="default">
                Read
              </Badge>
            } 
          />
        </Tabs>
      </Paper>

      {filteredNotifications.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <NotificationsIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No notifications found
          </Typography>
        </Box>
      ) : (
        <List>
          {filteredNotifications.map((notification, index) => (
            <React.Fragment key={notification.id}>
              <ListItem
                alignItems="flex-start"
                sx={{
                  bgcolor: notification.read ? 'transparent' : 'action.hover',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                }}
              >
                <ListItemIcon>
                  {notification.read ? (
                    <CheckCircleIcon color="action" />
                  ) : (
                    <UnreadIcon color="primary" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography
                        component="span"
                        variant="subtitle1"
                        color="text.primary"
                        sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}
                      >
                        {notification.title}
                      </Typography>
                      <Box sx={{ ml: 1 }}>
                        {getNotificationChip(notification.type)}
                      </Box>
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.primary"
                        sx={{ display: 'block', mb: 0.5 }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                      >
                        {new Date(notification.createdAt).toLocaleString()}
                      </Typography>
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  {!notification.read && (
                    <IconButton 
                      edge="end" 
                      aria-label="mark as read" 
                      onClick={() => handleMarkAsRead(notification.id)}
                      sx={{ mr: 1 }}
                    >
                      <CheckCircleIcon />
                    </IconButton>
                  )}
                  <IconButton 
                    edge="end" 
                    aria-label="delete" 
                    onClick={() => handleDeleteClick(notification)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              {index < filteredNotifications.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Notification</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this notification? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear All Confirmation Dialog */}
      <Dialog
        open={clearAllDialogOpen}
        onClose={() => setClearAllDialogOpen(false)}
      >
        <DialogTitle>Clear All Notifications</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to clear all notifications? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearAllDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleClearAllConfirm} color="error" autoFocus>
            Clear All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Notifications; 