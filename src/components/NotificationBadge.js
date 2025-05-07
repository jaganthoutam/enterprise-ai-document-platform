import React, { useState, useEffect } from 'react';
import { Badge, IconButton, Tooltip } from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getUnreadNotificationCount } from '../api/notifications';

function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnreadCount();
    
    // Set up polling to refresh the count every minute
    const intervalId = setInterval(fetchUnreadCount, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    navigate('/notifications');
  };

  return (
    <Tooltip title="Notifications">
      <IconButton 
        color="inherit" 
        onClick={handleClick}
        disabled={loading}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}

export default NotificationBadge; 