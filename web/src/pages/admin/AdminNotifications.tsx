import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Badge,
  Chip,
  Paper,
  Skeleton,
  Divider,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  MarkEmailRead,
  Delete,
  Circle,
  Info,
  Warning,
  CheckCircle,
  Error,
  LocalOffer,
  Restaurant,
} from '@mui/icons-material';
import { api } from '../../services/api';

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'PROMO' | 'ORDER';
  read: boolean;
  createdAt: string;
  data?: any;
}

const AdminNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [tabValue]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response: any = await api.getAdminNotifications();
      if (response?.success) {
        const rawNotifications = response.data?.notifications || response.data || [];
        const normalized = rawNotifications.map((n: any) => ({
          _id: n._id || n.id,
          title: n.title || 'Notification',
          message: n.message || n.body || '',
          type: n.type || 'INFO',
          read: n.read ?? false,
          createdAt: n.createdAt || new Date().toISOString(),
          data: n.data || {},
        }));
        setNotifications(normalized);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response: any = await api.getNotificationUnreadCount();
      if (response?.success) {
        setUnreadCount(response.data?.count || 0);
      }
    } catch (err) {
      console.error('Error loading unread count:', err);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const response: any = await api.markAdminNotificationAsRead(id);
      if (response?.success) {
        setNotifications(notifications.map(n => 
          n._id === id ? { ...n, read: true } : n
        ));
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response: any = await api.markAllNotificationsAsRead();
      if (response?.success) {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response: any = await api.deleteAdminNotification(id);
      if (response?.success) {
        const notification = notifications.find(n => n._id === id);
        if (notification && !notification.read) {
          setUnreadCount(Math.max(0, unreadCount - 1));
        }
        setNotifications(notifications.filter(n => n._id !== id));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'WARNING': return <Warning sx={{ color: '#FF9800' }} />;
      case 'SUCCESS': return <CheckCircle sx={{ color: '#4CAF50' }} />;
      case 'ERROR': return <Error sx={{ color: '#F44336' }} />;
      case 'PROMO': return <LocalOffer sx={{ color: '#9C27B0' }} />;
      case 'ORDER': return <Restaurant sx={{ color: '#2196F3' }} />;
      default: return <Info sx={{ color: '#607D8B' }} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'WARNING': return '#FFF3E0';
      case 'SUCCESS': return '#E8F5E9';
      case 'ERROR': return '#FFEBEE';
      case 'PROMO': return '#F3E5F5';
      case 'ORDER': return '#E3F2FD';
      default: return '#F5F5F5';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(n => {
    if (tabValue === 1) return !n.read;
    if (tabValue === 2) return n.read;
    return true;
  });

  return (
    <Box sx={{ p: 3, bgcolor: '#f8f5ff', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon sx={{ fontSize: 28, color: '#FF6B35' }} />
          </Badge>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>
            Notifications
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<MarkEmailRead />}
          onClick={handleMarkAllAsRead}
          disabled={unreadCount === 0}
        >
          Mark All as Read
        </Button>
      </Box>

      <Paper sx={{ borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`All (${notifications.length})`} />
          <Tab label={`Unread (${unreadCount})`} />
          <Tab label="Read" />
        </Tabs>

        <List sx={{ p: 0 }}>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <React.Fragment key={i}>
                <ListItem sx={{ px: 3 }}>
                  <ListItemAvatar>
                    <Skeleton variant="circular" width={40} height={40} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Skeleton variant="text" width="40%" />}
                    secondary={<Skeleton variant="text" width="80%" />}
                  />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))
          ) : filteredNotifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <NotificationsIcon sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
              <Typography color="#999">No notifications found</Typography>
            </Box>
          ) : (
            filteredNotifications.map((notification, index) => (
              <React.Fragment key={notification._id}>
                <ListItem
                  sx={{
                    px: 3,
                    bgcolor: notification.read ? 'transparent' : getNotificationColor(notification.type),
                    '&:hover': { bgcolor: '#f5f5f5' },
                  }}
                  secondaryAction={
                    <Box>
                      {!notification.read && (
                        <IconButton size="small" onClick={() => handleMarkAsRead(notification._id)}>
                          <MarkEmailRead sx={{ fontSize: 18 }} />
                        </IconButton>
                      )}
                      <IconButton size="small" onClick={() => handleDelete(notification._id)}>
                        <Delete sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'transparent' }}>
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontWeight: notification.read ? 400 : 600 }}>
                          {notification.title}
                        </Typography>
                        {!notification.read && (
                          <Circle sx={{ fontSize: 8, color: '#FF6B35' }} />
                        )}
                        <Chip
                          label={notification.type}
                          size="small"
                          sx={{ fontSize: 10, height: 20 }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box component="span" sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography component="span" variant="body2" color="textSecondary">
                          {notification.message}
                        </Typography>
                        <Typography component="span" variant="caption" color="#999">
                          {formatTime(notification.createdAt)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < filteredNotifications.length - 1 && <Divider />}
              </React.Fragment>
            ))
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default AdminNotifications;
