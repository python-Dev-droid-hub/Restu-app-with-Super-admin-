import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Close,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
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

const AdminTopBar: React.FC<{ mode?: 'admin' | 'manager' | 'chef' }> = ({ mode = 'admin' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const urlQuery = useMemo(() => new URLSearchParams(location.search).get('q') || '', [location.search]);
  const [searchValue, setSearchValue] = useState(urlQuery);

  useEffect(() => {
    setSearchValue((prev) => (prev === urlQuery ? prev : urlQuery));
  }, [urlQuery]);

  // Fetch notification counts and user data
  useEffect(() => {
    setLoading(true);
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
    setLoading(false);

    if (mode === 'chef') {
      let cancelled = false;

      const fetchUnread = async () => {
        const res = await api.get<any>('/notifications/chef/unread-count');
        if (cancelled) return;
        if (res?.success) {
          setNotificationCount(Number(res?.data?.unreadCount ?? 0));
        } else {
          setNotificationCount(0);
        }
      };

      void fetchUnread();
      const intervalId = window.setInterval(() => {
        void fetchUnread();
      }, 30000);

      return () => {
        cancelled = true;
        window.clearInterval(intervalId);
      };
    }

    if (socketRef.current) return;

    const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken') || '';
    const rawApiUrl = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
    const rawProxyTarget = (import.meta as any)?.env?.VITE_PROXY_TARGET as string | undefined;

    const normalizeHost = (value?: string): string => {
      const v = (value || '').trim();
      if (!v) return '';
      return v.replace(/\/?api\/?$/, '').replace(/\/$/, '');
    };

    const socketUrl = normalizeHost(rawProxyTarget) || normalizeHost(rawApiUrl) || 'http://localhost:3101';

    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined,
    });
    socketRef.current = socket;

    const requestUnread = () => socket.emit('admin_unread_count:get');

    socket.on('connect', requestUnread);
    socket.on('admin_unread_count:data', (payload: any) => {
      setNotificationCount(typeof payload?.unreadCount === 'number' ? payload.unreadCount : 0);
    });
    socket.on('notification', requestUnread);

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [mode]);

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

  const basePath = mode === 'manager' ? '/manager' : mode === 'chef' ? '/chef' : '/admin';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(location.search);
      const trimmed = searchValue.trim();
      if (trimmed) params.set('q', trimmed);
      else params.delete('q');
      const nextSearch = params.toString();
      const normalizedNext = nextSearch ? `?${nextSearch}` : '';
      if (normalizedNext !== location.search) {
        navigate({ pathname: location.pathname, search: normalizedNext }, { replace: true });
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [location.pathname, location.search, navigate, searchValue]);

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
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            const params = new URLSearchParams(location.search);
            const trimmed = searchValue.trim();
            if (trimmed) params.set('q', trimmed);
            else params.delete('q');
            const nextSearch = params.toString();
            const normalizedNext = nextSearch ? `?${nextSearch}` : '';
            if (normalizedNext !== location.search) {
              navigate({ pathname: location.pathname, search: normalizedNext }, { replace: true });
            }
          }}
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
            endAdornment: searchValue.trim() ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label="Clear search"
                  onClick={() => setSearchValue('')}
                  sx={{ color: '#999' }}
                >
                  <Close sx={{ fontSize: 18 }} />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          }}
        />

        {/* Right Icons */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Notifications */}
          <IconButton
            size="small"
            onClick={() => navigate(`${basePath}/notifications`)}
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
                },
              }}
            >
              <NotificationIcon sx={{ fontSize: 20 }} />
            </Badge>
          </IconButton>

          {/* Cart */}
          {mode === 'admin' && (
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
          )}

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
                  imgProps={{ loading: 'lazy', decoding: 'async' }}
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
            <MenuItem onClick={() => handleNavigate(`${basePath}/settings`)}>
              Change profile name
            </MenuItem>
            <MenuItem onClick={() => handleNavigate(`${basePath}/settings`)}>
              Change profile image
            </MenuItem>
            <MenuItem onClick={() => handleNavigate(`${basePath}/settings`)}>
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
