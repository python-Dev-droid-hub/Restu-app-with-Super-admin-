import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Typography,
  AppBar, Toolbar, alpha, Avatar, Chip, ListSubheader, Button, IconButton, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StoreIcon from '@mui/icons-material/Store';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import PaymentsIcon from '@mui/icons-material/Payments';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import CampaignIcon from '@mui/icons-material/Campaign';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearSuperAdminSession, getSuperAdminUser } from '../../utils/superAdminAuthStorage';
import { superAdminApi } from '../../services/superAdminApi';
import { useSuperAdminTokenRefresh } from '../../hooks/useSuperAdminTokenRefresh';
import SuperAdminCommandPalette from './SuperAdminCommandPalette';
import BrandLogo from './BrandLogo';
import { saas } from './superAdminTokens';
import { sidebarDrawerPaperSx, sidebarNavScrollSx } from './sidebarStyles';

type NavItem = { label: string; path: string; icon: React.ReactNode; exact?: boolean };
type NavSection = { title: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', path: '/superadmin/dashboard', icon: <DashboardIcon sx={{ fontSize: 18 }} /> }],
  },
  {
    title: 'Restaurants',
    items: [
      { label: 'All Tenants', path: '/superadmin/tenants', icon: <StoreIcon sx={{ fontSize: 18 }} />, exact: true },
      { label: 'Launch Tenant', path: '/superadmin/tenants/new', icon: <AddBusinessIcon sx={{ fontSize: 18 }} /> },
      { label: 'Plans & Pricing', path: '/superadmin/plans', icon: <CardMembershipIcon sx={{ fontSize: 18 }} /> },
    ],
  },
  {
    title: 'Billing',
    items: [
      { label: 'Subscriptions', path: '/superadmin/subscriptions', icon: <PaymentsIcon sx={{ fontSize: 18 }} /> },
      { label: 'Revenue Analytics', path: '/superadmin/billing/analytics', icon: <AnalyticsIcon sx={{ fontSize: 18 }} /> },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Support Tickets', path: '/superadmin/support', icon: <SupportAgentIcon sx={{ fontSize: 18 }} /> },
      { label: 'Announcements', path: '/superadmin/announcements', icon: <CampaignIcon sx={{ fontSize: 18 }} /> },
      { label: 'Activity Log', path: '/superadmin/activity', icon: <HistoryIcon sx={{ fontSize: 18 }} /> },
    ],
  },
  {
    title: 'System',
    items: [{ label: 'Settings', path: '/superadmin/settings', icon: <SettingsIcon sx={{ fontSize: 18 }} /> }],
  },
];

function getPageMeta(pathname: string): { title: string; section: string } {
  if (pathname.startsWith('/superadmin/dashboard')) return { section: 'Overview', title: 'Dashboard' };
  if (pathname.startsWith('/superadmin/tenants/new')) return { section: 'Restaurants', title: 'Launch tenant' };
  if (pathname.match(/\/superadmin\/tenants\/[^/]+\/edit/)) return { section: 'Restaurants', title: 'Edit tenant' };
  if (pathname.match(/\/superadmin\/tenants\/[^/]+/)) return { section: 'Restaurants', title: 'Tenant details' };
  if (pathname.startsWith('/superadmin/tenants')) return { section: 'Restaurants', title: 'All tenants' };
  if (pathname.startsWith('/superadmin/plans/new')) return { section: 'Restaurants', title: 'Create plan' };
  if (pathname.match(/\/superadmin\/plans\/[^/]+\/edit/)) return { section: 'Restaurants', title: 'Edit plan' };
  if (pathname.startsWith('/superadmin/plans')) return { section: 'Restaurants', title: 'Plans & pricing' };
  if (pathname.startsWith('/superadmin/subscriptions')) return { section: 'Billing', title: 'Subscriptions' };
  if (pathname.startsWith('/superadmin/billing/analytics')) return { section: 'Billing', title: 'Revenue analytics' };
  if (pathname.match(/\/superadmin\/support\/new/)) return { section: 'Operations', title: 'New ticket' };
  if (pathname.match(/\/superadmin\/support\/[^/]+/)) return { section: 'Operations', title: 'Support ticket' };
  if (pathname.startsWith('/superadmin/support')) return { section: 'Operations', title: 'Support tickets' };
  if (pathname.startsWith('/superadmin/announcements')) return { section: 'Operations', title: 'Announcements' };
  if (pathname.startsWith('/superadmin/activity')) return { section: 'Operations', title: 'Activity log' };
  if (pathname.startsWith('/superadmin/settings')) return { section: 'System', title: 'Platform settings' };
  return { section: saas.brand.console, title: 'Console' };
}

function searchShortcutLabel(): string {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform)) return '⌘K';
  return 'Ctrl+K';
}

function NavLink({ item, selected, onNavigate }: { item: NavItem; selected: boolean; onNavigate: () => void }) {
  return (
    <ListItemButton
      selected={false}
      onClick={onNavigate}
      sx={{
        mb: 0.5,
        py: 1.1,
        px: 1.25,
        borderRadius: `${saas.radius.sm}px`,
        color: selected ? '#fff' : saas.colors.sidebarText,
        bgcolor: selected ? saas.colors.sidebarActive : 'transparent',
        border: selected ? `1px solid ${saas.colors.sidebarActiveBorder}` : '1px solid transparent',
        transition: 'all 0.18s ease',
        '&:hover': {
          bgcolor: selected ? saas.colors.sidebarActive : saas.colors.sidebarHover,
          borderColor: selected ? saas.colors.sidebarActiveBorder : 'rgba(255,255,255,0.06)',
        },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: 38,
          color: selected ? saas.colors.primary : saas.colors.sidebarIcon,
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: `${saas.radius.sm}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: selected ? alpha(saas.colors.primary, 0.22) : 'transparent',
            color: selected ? saas.colors.primary : 'inherit',
            transition: 'background 0.18s',
          }}
        >
          {item.icon}
        </Box>
      </ListItemIcon>
      <ListItemText
        primary={item.label}
        primaryTypographyProps={{
          fontSize: 13.5,
          fontWeight: selected ? 600 : 500,
          letterSpacing: '-0.01em',
          color: 'inherit',
        }}
      />
    </ListItemButton>
  );
}

function SuperAdminSidebar({
  variant = 'permanent',
  open = false,
  onClose,
}: {
  variant?: 'permanent' | 'temporary';
  open?: boolean;
  onClose?: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const admin = getSuperAdminUser();

  const logout = async () => {
    try {
      await superAdminApi.post('/auth/logout');
    } catch {
      /* clear local session even if API fails */
    }
    clearSuperAdminSession();
    navigate('/superadmin/login');
  };

  const goTo = (path: string) => {
    navigate(path);
    if (variant === 'temporary') onClose?.();
  };

  const isSelected = (item: NavItem) =>
    item.exact
      ? location.pathname === item.path
      : location.pathname === item.path || location.pathname.startsWith(item.path + '/');

  const displayName = String(admin?.displayName || admin?.email || 'Admin');
  const initials = displayName.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || 'AD';
  const roleLabel = String(admin?.role || 'SUPER_ADMIN').replace(/_/g, ' ');

  return (
    <Drawer
      variant={variant}
      open={variant === 'temporary' ? open : true}
      onClose={onClose}
      ModalProps={variant === 'temporary' ? { keepMounted: true } : undefined}
      sx={{
        width: variant === 'permanent' ? saas.sidebarWidth : undefined,
        flexShrink: 0,
        '& .MuiDrawer-paper': sidebarDrawerPaperSx,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          py: 2.5,
          borderBottom: `1px solid ${saas.colors.sidebarBorder}`,
          flexShrink: 0,
        }}
      >
        <BrandLogo size="sm" variant="light" />
      </Box>

      {/* Nav */}
      <List sx={sidebarNavScrollSx} disablePadding>
        {navSections.map((section, si) => (
          <Box key={section.title} sx={{ mb: si < navSections.length - 1 ? 0.5 : 0 }}>
            <ListSubheader
              disableSticky
              sx={{
                bgcolor: 'transparent',
                color: saas.colors.sidebarTextMuted,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                lineHeight: '28px',
                px: 1.5,
                pt: si === 0 ? 0 : 1.5,
                pb: 0.5,
              }}
            >
              {section.title.toUpperCase()}
            </ListSubheader>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                item={item}
                selected={isSelected(item)}
                onNavigate={() => goTo(item.path)}
              />
            ))}
          </Box>
        ))}
      </List>

      {/* User footer */}
      <Box
        sx={{
          flexShrink: 0,
          p: 2,
          borderTop: `1px solid ${saas.colors.sidebarBorder}`,
          bgcolor: alpha('#000', 0.2),
        }}
      >
        <Box
          sx={{
            p: 1.5,
            mb: 1,
            borderRadius: `${saas.radius.md}px`,
            bgcolor: saas.colors.sidebarSurface,
            border: `1px solid ${saas.colors.sidebarBorder}`,
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                background: `linear-gradient(145deg, ${saas.colors.primary} 0%, ${saas.colors.primaryDark} 100%)`,
                fontSize: 14,
                fontWeight: 700,
                boxShadow: `0 2px 8px ${alpha(saas.colors.primary, 0.35)}`,
              }}
            >
              {initials}
            </Avatar>
            <Box minWidth={0} flex={1}>
              <Typography
                variant="body2"
                noWrap
                sx={{ fontWeight: 600, color: '#FFFFFF', fontSize: 13, lineHeight: 1.3 }}
              >
                {displayName}
              </Typography>
              <Chip
                label={roleLabel}
                size="small"
                sx={{
                  height: 20,
                  mt: 0.5,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  bgcolor: alpha(saas.colors.primary, 0.15),
                  color: saas.colors.primary,
                  border: `1px solid ${alpha(saas.colors.primary, 0.35)}`,
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            </Box>
          </Box>
        </Box>

        <ListItemButton
          onClick={logout}
          sx={{
            borderRadius: `${saas.radius.sm}px`,
            py: 1,
            px: 1.25,
            color: saas.colors.sidebarTextMuted,
            border: `1px solid transparent`,
            '&:hover': {
              bgcolor: saas.colors.sidebarHover,
              color: '#fff',
              borderColor: saas.colors.sidebarBorder,
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
            <LogoutIcon sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText
            primary="Sign out"
            primaryTypographyProps={{ fontSize: 13, fontWeight: 500, color: 'inherit' }}
          />
        </ListItemButton>
      </Box>
    </Drawer>
  );
}

export function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  useSuperAdminTokenRefresh();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageMeta = useMemo(() => getPageMeta(location.pathname), [location.pathname]);
  const shortcut = useMemo(() => searchShortcutLabel(), []);

  useEffect(() => {
    if (!isMobile && mobileOpen) setMobileOpen(false);
  }, [isMobile, mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', bgcolor: saas.colors.pageBg, overflowX: 'hidden' }}>
      {isMobile ? (
        <SuperAdminSidebar variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} />
      ) : (
        <SuperAdminSidebar variant="permanent" />
      )}
      <Box
        component="main"
        sx={{
          flex: '1 1 0',
          minWidth: 0,
          width: '100%',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            width: '100%',
            bgcolor: '#fff',
            color: saas.colors.textDark,
            borderBottom: `1px solid ${saas.colors.cardBorder}`,
            boxShadow: saas.shadow.header,
          }}
        >
          <Toolbar
            sx={{
              gap: { xs: 1, sm: 2 },
              minHeight: { xs: 56, sm: 60 },
              width: '100%',
              px: { xs: 1.5, sm: 3 },
              justifyContent: 'space-between',
            }}
          >
            <Box display="flex" alignItems="center" gap={1} minWidth={0} flex={1}>
              {isMobile && (
                <IconButton
                  edge="start"
                  aria-label="Open navigation"
                  onClick={() => setMobileOpen(true)}
                  sx={{ color: saas.colors.textDark, flexShrink: 0 }}
                >
                  <MenuIcon />
                </IconButton>
              )}
              <Box minWidth={0}>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: saas.colors.textMuted,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontSize: 10,
                  lineHeight: 1.2,
                }}
              >
                {pageMeta.section}
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  fontSize: { xs: 16, sm: 18 },
                  lineHeight: 1.3,
                  color: saas.colors.textDark,
                }}
                noWrap
              >
                {pageMeta.title}
              </Typography>
              </Box>
            </Box>

            <Button
              onClick={() => setSearchOpen(true)}
              variant="outlined"
              startIcon={<SearchIcon sx={{ fontSize: 18 }} />}
              sx={{
                flexShrink: 0,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: 13,
                color: saas.colors.textMuted,
                borderColor: saas.colors.cardBorder,
                bgcolor: saas.colors.pageBg,
                px: { xs: 1.5, sm: 2 },
                py: 0.85,
                borderRadius: `${saas.radius.md}px`,
                minWidth: { xs: 44, sm: 220 },
                justifyContent: { xs: 'center', sm: 'flex-start' },
                '&:hover': {
                  borderColor: alpha(saas.colors.primary, 0.45),
                  bgcolor: alpha(saas.colors.primary, 0.04),
                  color: saas.colors.textDark,
                },
              }}
            >
              <Box
                component="span"
                sx={{ display: { xs: 'none', sm: 'inline' }, flex: 1, textAlign: 'left' }}
              >
                Search platform…
              </Box>
              <Chip
                label={shortcut}
                size="small"
                variant="outlined"
                sx={{
                  height: 20,
                  fontSize: 10,
                  fontWeight: 700,
                  ml: { xs: 0, sm: 1 },
                  display: { xs: 'none', sm: 'flex' },
                  borderColor: alpha(saas.colors.textMuted, 0.35),
                  color: saas.colors.textMuted,
                }}
              />
            </Button>
          </Toolbar>
        </AppBar>
        <Box
          sx={{
            flex: 1,
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            overflowX: 'hidden',
            p: { xs: 1.5, sm: 2, md: 3 },
          }}
        >
          {children}
        </Box>
      </Box>
      <SuperAdminCommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </Box>
  );
}

export default SuperAdminLayout;
