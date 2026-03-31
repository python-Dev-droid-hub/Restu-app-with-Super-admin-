import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  TextField,
  InputAdornment,
  IconButton,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  Notifications as NotificationIcon,
  ShoppingCart,
  Search,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

const SIDEBAR_WIDTH = 260;

const sanitizeWebImageSrc = (src: unknown): string | null => {
  if (!src || typeof src !== 'string') return null;
  const trimmed = src.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('file:') || lower.includes('var/mobile') || lower.includes('imagepicker')) return null;
  return trimmed;
};

const AdminTopBar: React.FC = () => {
  const navigate = useNavigate();
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Fetch notification counts and user data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Load user data from localStorage
        const userData = localStorage.getItem('userData');
        if (userData) {
          try {
            const parsed = JSON.parse(userData);
            setAdminName(parsed.name || parsed.displayName || 'Admin');
            setProfileImage(sanitizeWebImageSrc(parsed.avatar || parsed.image || parsed.profileImage));
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }

        // Fetch notification count
        const notifRes = await api.getNotificationUnreadCount().catch(() => ({ success: false, data: null }));
        if (notifRes.success && notifRes.data) {
          const data = notifRes.data as { unreadCount?: number; count?: number };
          setNotificationCount(data.unreadCount || data.count || 0);
        }
      } catch (err) {
        console.error('[TopBar Error]', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    navigate('/login');
    handleProfileMenuClose();
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleProfileMenuClose();
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        bgcolor: 'white',
        color: '#666',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        zIndex: 100,
              ml: `${SIDEBAR_WIDTH}px`,
        width: `calc(100% - ${SIDEBAR_WIDTH}px)`,
      }}
    >
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: 3, minHeight: '64px' }}>
        {/* Left - Empty space where logo was (sidebar has logo) */}
        <Box sx={{ minWidth: 20 }} />

        {/* Center - Search Bar */}
        <TextField
          variant="outlined"
          placeholder="Search..."
          size="small"
          sx={{
            width: 400,
            maxWidth: 500,
            flex: 1,
            mx: 4,
            '& .MuiOutlinedInput-root': {
              bgcolor: '#f5f5f5',
              borderRadius: 3,
              height: 44,
              '& fieldset': {
                border: 'none',
              },
              '&:hover fieldset': {
                border: 'none',
              },
              '&.Mui-focused fieldset': {
                border: '1px solid #FF6B35',
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: '#999', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />

        {/* Right Icons */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Notifications */}
          <IconButton
            size="small"
            onClick={() => navigate('/admin/notifications')}
            sx={{
              color: '#666',
              width: 40,
              height: 40,
              '&:hover': {
                bgcolor: '#f5f5f5',
              },
            }}
          >
            <Badge 
              badgeContent={notificationCount} 
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: 10,
                  minWidth: 16,
                  height: 16,
                }
              }}
            >
              <NotificationIcon sx={{ fontSize: 20 }} />
            </Badge>
          </IconButton>

          {/* Cart */}
          <IconButton
            size="small"
            sx={{
              color: '#666',
              width: 40,
              height: 40,
              '&:hover': {
                bgcolor: '#f5f5f5',
              },
            }}
          >
            <Badge badgeContent={0} color="error">
              <ShoppingCart sx={{ fontSize: 20 }} />
            </Badge>
          </IconButton>

          {/* Profile Dropdown */}
          <Box
            onClick={handleProfileMenuOpen}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              ml: 1,
              pl: 1.5,
              borderLeft: '1px solid #e0e0e0',
              '&:hover': {
                bgcolor: '#f5f5f5',
              },
              borderRadius: 2,
              px: 1.5,
              py: 0.8,
              transition: 'all 0.2s',
            }}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : (
              <>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: '#FF6B35',
                    fontSize: 14,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                  src={profileImage || undefined}
                >
                  {!profileImage && adminName.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#333' }}>
                    {adminName}
                  </Typography>
                </Box>
                <KeyboardArrowDown sx={{ fontSize: 18, color: '#999' }} />
              </>
            )}
          </Box>

          {/* Profile Menu */}
          <Menu
            anchorEl={profileMenuAnchor}
            open={Boolean(profileMenuAnchor)}
            onClose={handleProfileMenuClose}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 180,
              },
            }}
          >
            <MenuItem onClick={() => handleNavigate('/admin/settings')}>
              Change profile name
            </MenuItem>
            <MenuItem onClick={() => handleNavigate('/admin/settings')}>
              Change profile image
            </MenuItem>
            <MenuItem onClick={() => handleNavigate('/admin/settings')}>
              Change password
            </MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AdminTopBar;
