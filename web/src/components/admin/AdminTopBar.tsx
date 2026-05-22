import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Menu as MenuIcon,
  Notifications as NotificationIcon,
  ShoppingCart,
  Search,
  Close,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { getSocketIoOptions, getSocketIoUrl } from '../../utils/socketOptions';
import {
  NOTIFICATIONS_UPDATED_EVENT,
  type NotificationsUpdatedDetail,
  fetchUserUnreadNotificationCount,
} from '../../utils/notificationCountSync';
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

const AdminTopBar: React.FC<{
  mode?: 'admin' | 'manager' | 'chef' | 'waiter' | 'rider';
  isMobile?: boolean;
  onMenuClick?: () => void;
}> = ({ mode = 'admin', isMobile = false, onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const lastUserKeyRef = useRef<string>('');
  const urlQuery = useMemo(() => new URLSearchParams(location.search).get('q') || '', [location.search]);
  const [searchValue, setSearchValue] = useState(urlQuery);

  useEffect(() => {
    setSearchValue((prev) => (prev === urlQuery ? prev : urlQuery));
  }, [urlQuery]);

  const normalizeAvatarSrc = useCallback((src: unknown): string | null => {
    const sanitized = sanitizeWebImageSrc(src);
    if (!sanitized) return null;
    const lower = sanitized.toLowerCase();
    if (lower.startsWith('data:image/')) return sanitized;
    if (/^https?:\/\//i.test(sanitized)) return sanitized;
    return api.getImageUrl(sanitized);
  }, []);

  const syncUserFromStorage = useCallback(() => {
    const raw = localStorage.getItem('userData');
    let nextName = 'Admin';
    let nextImage: string | null = null;

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        nextName = String(parsed?.name || parsed?.displayName || 'Admin');
        nextImage = normalizeAvatarSrc(parsed?.avatar || parsed?.image || parsed?.profileImage);
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    const key = `${nextName}::${nextImage || ''}`;
    if (key === lastUserKeyRef.current) return;
    lastUserKeyRef.current = key;
    setAdminName(nextName || 'Admin');
    setProfileImage(nextImage);
  }, [normalizeAvatarSrc]);

  useEffect(() => {
    syncUserFromStorage();

    const handle = () => syncUserFromStorage();
    window.addEventListener('storage', handle);
    window.addEventListener('profileUpdated', handle as EventListener);
    window.addEventListener('userDataUpdated', handle as EventListener);

    let cancelled = false;
    const refreshFromApi = async () => {
      setLoading(true);
      try {
        const res = await api.get<any>('/users/profile');
        if (!res?.success || cancelled) return;
        const d = res?.data || {};
        const rawImage = d?.profileImage || d?.avatar || d?.image || '';
        const patch = {
          name: d?.displayName || d?.name,
          displayName: d?.displayName || d?.name,
          avatar: rawImage,
          image: rawImage,
          profileImage: rawImage,
        };

        const existingRaw = localStorage.getItem('userData');
        const existing = existingRaw ? (() => { try { return JSON.parse(existingRaw); } catch { return {}; } })() : {};
        const next = { ...existing, ...patch };
        const nextRaw = JSON.stringify(next);
        if (existingRaw !== nextRaw) {
          localStorage.setItem('userData', nextRaw);
          window.dispatchEvent(new Event('profileUpdated'));
          window.dispatchEvent(new Event('userDataUpdated'));
        }
      } catch {
        return;
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void refreshFromApi();

    return () => {
      cancelled = true;
      window.removeEventListener('storage', handle);
      window.removeEventListener('profileUpdated', handle as EventListener);
      window.removeEventListener('userDataUpdated', handle as EventListener);
    };
  }, [syncUserFromStorage]);

  useEffect(() => {
    const fetchAdminUnread = async () => {
      try {
        const res = await api.getNotificationUnreadCount();
        if (res?.success) {
          const data = res.data as { unreadCount?: number } | undefined;
          setNotificationCount(Number(data?.unreadCount ?? 0));
        }
      } catch {
        /* non-fatal */
      }
    };

    if (mode === 'admin' || mode === 'manager') {
      void fetchAdminUnread();

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      const socket = io(getSocketIoUrl(), getSocketIoOptions());
      socketRef.current = socket;

      const requestUnread = () => {
        socket.emit('admin_unread_count:get');
        void fetchAdminUnread();
      };

      socket.on('connect', requestUnread);
      socket.on('admin_unread_count:data', (payload: any) => {
        setNotificationCount(typeof payload?.unreadCount === 'number' ? payload.unreadCount : 0);
      });
      socket.on('notification', requestUnread);

      return () => {
        socket.off('connect', requestUnread);
        socket.off('admin_unread_count:data');
        socket.off('notification', requestUnread);
        socket.disconnect();
        socketRef.current = null;
      };
    }

    if (mode === 'chef' || mode === 'waiter' || mode === 'rider') {
      socketRef.current?.disconnect();
      socketRef.current = null;

      let cancelled = false;
      const fetchUnread = async () => {
        if (cancelled) return;
        if (mode === 'waiter') {
          const count = await fetchUserUnreadNotificationCount((path) => api.get(path));
          if (!cancelled) setNotificationCount(count);
          return;
        }
        const url =
          mode === 'chef' ? '/notifications/chef/unread-count' : '/notifications/rider/unread-count';
        const res = await api.get<{ unreadCount?: number }>(url);
        if (cancelled) return;
        if (res?.success) {
          setNotificationCount(Number(res?.data?.unreadCount ?? 0));
        } else {
          setNotificationCount(0);
        }
      };

      void fetchUnread();

      const onNotificationsUpdated = (event: Event) => {
        if (mode !== 'waiter') return;
        const detail = (event as CustomEvent<NotificationsUpdatedDetail>).detail;
        if (typeof detail?.unreadCount === 'number') {
          setNotificationCount(Math.max(0, detail.unreadCount));
          return;
        }
        void fetchUnread();
      };
      window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, onNotificationsUpdated);

      const socket = io(getSocketIoUrl(), getSocketIoOptions());

      const onRealtime = () => {
        void fetchUnread();
      };

      socket.on('notification', onRealtime);
      socket.on('connect', onRealtime);

      return () => {
        cancelled = true;
        window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, onNotificationsUpdated);
        socket.off('notification', onRealtime);
        socket.off('connect', onRealtime);
        socket.disconnect();
      };
    }

  }, [mode]);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    navigate('/login');
    handleProfileMenuClose();
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleProfileMenuClose();
  };

  const basePath =
    mode === 'manager' ? '/manager' : mode === 'chef' ? '/chef' : mode === 'waiter' ? '/waiter' : mode === 'rider' ? '/rider' : '/admin';

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
        ml: isMobile ? 0 : `${SIDEBAR_WIDTH}px`,
        width: isMobile ? '100%' : `calc(100% - ${SIDEBAR_WIDTH}px)`,
      }}
    >
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: isMobile ? 2 : 3, minHeight: '64px', gap: isMobile ? 1.5 : 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: isMobile ? 'auto' : 20 }}>
          {isMobile ? (
            <IconButton
              size="small"
              onClick={onMenuClick}
              sx={{ color: '#666', width: 40, height: 40, '&:hover': { bgcolor: '#f5f5f5' } }}
            >
              <MenuIcon sx={{ fontSize: 22 }} />
            </IconButton>
          ) : null}
        </Box>

        {mode !== 'waiter' && mode !== 'rider' ? (
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
              flex: 1,
              mx: isMobile ? 1 : 4,
              minWidth: isMobile ? 120 : 280,
              maxWidth: isMobile ? 520 : 500,
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
        ) : (
          <Box sx={{ flex: 1 }} />
        )}

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
              badgeContent={notificationCount > 0 ? notificationCount : undefined}
              color="error"
              max={99}
              overlap="circular"
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
                {!isMobile ? (
                  <>
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#333' }}>
                        {adminName}
                      </Typography>
                    </Box>
                    <KeyboardArrowDown sx={{ fontSize: 18, color: '#999' }} />
                  </>
                ) : null}
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
            {mode === 'waiter' || mode === 'rider' ? (
              <>
                <MenuItem onClick={() => handleNavigate(`${basePath}/profile`)}>Profile</MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </>
            ) : (
              <>
                <MenuItem onClick={() => handleNavigate(`${basePath}/settings`)}>Change profile name</MenuItem>
                <MenuItem onClick={() => handleNavigate(`${basePath}/settings`)}>Change profile image</MenuItem>
                <MenuItem onClick={() => handleNavigate(`${basePath}/settings`)}>Change password</MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </>
            )}
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AdminTopBar;
