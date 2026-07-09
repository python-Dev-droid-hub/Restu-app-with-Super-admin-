import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
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
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Notifications as NotificationsIcon,
  MarkEmailRead,
  DeleteSweep,
  Delete,
  Circle,
  Info,
  Warning,
  CheckCircle,
  Error,
  LocalOffer,
  Restaurant,
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { io, type Socket } from 'socket.io-client';
import {
  publishNotificationUnreadCount,
  resolveStaffBranchId,
} from '../../utils/notificationCountSync';
import { getSocketIoOptions, getSocketIoUrl } from '../../utils/socketOptions';
import { useAdminPageStyles } from '../../utils/adminResponsive';

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
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { page, header, headerActions, titleSx, primary } = useAdminPageStyles();
  const isManager = location.pathname.startsWith('/manager');
  const ordersBase = isManager ? '/manager' : '/admin';
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  const applyUnread = (count: number, broadcast = true) => {
    const n = Math.max(0, count);
    setUnreadCount(n);
    if (broadcast) {
      publishNotificationUnreadCount(n);
    }
  };

  const refreshUnreadCount = async () => {
    try {
      const branchId = isManager ? resolveStaffBranchId() : undefined;
      const res = await api.getNotificationUnreadCount(branchId ? { branchId } : undefined);
      if (res?.success) {
        const data = res.data as { unreadCount?: number } | undefined;
        applyUnread(Number(data?.unreadCount ?? 0));
      }
    } catch {
      /* non-fatal */
    }
  };

  useEffect(() => {
    loadNotifications();
    void refreshUnreadCount();
    if (socketRef.current?.connected) {
      socketRef.current.emit('admin_unread_count:get');
    }
  }, [tabValue, isManager]);

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
          read: n.read ?? n.isRead ?? false,
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

  useEffect(() => {
    if (socketRef.current) return;

    const socket = io(getSocketIoUrl(), getSocketIoOptions());
    socketRef.current = socket;

    const requestUnread = () => {
      socket.emit('admin_unread_count:get');
      void refreshUnreadCount();
    };

    socket.on('connect', requestUnread);
    socket.on('admin_unread_count:data', (payload: any) => {
      applyUnread(typeof payload?.unreadCount === 'number' ? payload.unreadCount : 0);
    });
    socket.on('notification', requestUnread);

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const handleNotificationClick = async (notification: NotificationItem) => {
    const orderId = notification.data?.orderId || notification.data?.order_id;
    if (orderId) {
      window.location.href = `${ordersBase}/orders?orderId=${encodeURIComponent(String(orderId))}`;
    }
    if (notification.read) return;
    await handleMarkAsRead(notification._id);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const response: any = await api.markAdminNotificationAsRead(id);
      if (response?.success) {
        setNotifications(notifications.map(n => 
          n._id === id ? { ...n, read: true } : n
        ));
        applyUnread(Math.max(0, unreadCount - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const branchId = isManager ? resolveStaffBranchId() : undefined;
      const response: any = await api.markAllNotificationsAsRead(branchId);
      if (response?.success) {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
        applyUnread(0);
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    if (
      !window.confirm(
        'Delete all notifications? This removes every notification in your list and cannot be undone.'
      )
    ) {
      return;
    }
    try {
      const branchId = isManager ? resolveStaffBranchId() : undefined;
      const response: any = await api.clearAllAdminNotifications(branchId);
      if (response?.success) {
        setNotifications([]);
        applyUnread(0);
      }
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response: any = await api.deleteAdminNotification(id);
      if (response?.success) {
        const notification = notifications.find(n => n._id === id);
        if (notification && !notification.read) {
          applyUnread(Math.max(0, unreadCount - 1));
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
    <Box sx={{ ...page, bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
      <Box sx={header}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon sx={{ fontSize: 28, color: primary }} />
          </Badge>
          <Typography variant="h5" sx={titleSx}>
            Notifications
          </Typography>
        </Box>
        <Box sx={headerActions}>
          <Button
            variant="outlined"
            startIcon={<MarkEmailRead />}
            onClick={() => void handleMarkAllAsRead()}
            disabled={unreadCount === 0}
          >
            Mark All as Read
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteSweep />}
            onClick={() => void handleClearAll()}
            disabled={notifications.length === 0}
          >
            Clear All
          </Button>
        </Box>
      </Box>

      <Paper sx={{ borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}
          variant={isMobile ? 'scrollable' : 'standard'}
          allowScrollButtonsMobile
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label={`All (${notifications.length})`} />
          <Tab label={`Unread (${unreadCount})`} />
          <Tab label="Read" />
        </Tabs>

        <List sx={{ p: 0 }}>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <React.Fragment key={i}>
                <ListItem sx={{ px: { xs: 2, md: 3 } }}>
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
                  disablePadding
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
                  <ListItemButton
                    onClick={() => void handleNotificationClick(notification)}
                    sx={{
                      px: { xs: 2, md: 3 },
                      bgcolor: notification.read ? 'transparent' : getNotificationColor(notification.type),
                      '&:hover': { bgcolor: '#f5f5f5' },
                    }}
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
                          <Circle sx={{ fontSize: 8, color: primary }} />
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
                  </ListItemButton>
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
