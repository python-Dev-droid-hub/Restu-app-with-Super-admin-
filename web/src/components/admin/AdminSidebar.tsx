import React from 'react';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
} from '@mui/material';
import {
  Dashboard,
  ShoppingCart,
  People,
  Notifications,
  Apps,
  Category,
  Fastfood,
  RestaurantMenu,
  Store,
  Image,
  LocalOffer,
  Sell,
  BarChart,
  Settings,
  Logout,
  TwoWheeler,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const SIDEBAR_WIDTH = 260;

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  key: string;
}

const AdminSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // All menu items visible directly - matching mobile admin interface
  const menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: <Dashboard sx={{ fontSize: 20 }} />, path: '/admin/dashboard', key: 'dashboard' },
    { label: 'Orders', icon: <ShoppingCart sx={{ fontSize: 20 }} />, path: '/admin/orders', key: 'orders' },
    { label: 'Users', icon: <People sx={{ fontSize: 20 }} />, path: '/admin/customers', key: 'users' },
    { label: 'Riders', icon: <TwoWheeler sx={{ fontSize: 20 }} />, path: '/admin/riders', key: 'riders' },
    { label: 'Notifications', icon: <Notifications sx={{ fontSize: 20 }} />, path: '/admin/notifications', key: 'notifications' },
    { label: 'Table Assignment', icon: <Apps sx={{ fontSize: 20 }} />, path: '/admin/table-assignment', key: 'table-assignment' },
    { label: 'Categories', icon: <Category sx={{ fontSize: 20 }} />, path: '/admin/categories', key: 'categories' },
    { label: 'Products', icon: <Fastfood sx={{ fontSize: 20 }} />, path: '/admin/products', key: 'products' },
    { label: 'Menu', icon: <RestaurantMenu sx={{ fontSize: 20 }} />, path: '/admin/menu', key: 'menu' },
    { label: 'Branches', icon: <Store sx={{ fontSize: 20 }} />, path: '/admin/branches', key: 'branches' },
    { label: 'Banner Management', icon: <Image sx={{ fontSize: 20 }} />, path: '/admin/banners', key: 'banners' },
    { label: 'Coupons', icon: <LocalOffer sx={{ fontSize: 20 }} />, path: '/admin/coupons', key: 'coupons' },
    { label: 'Deals', icon: <Sell sx={{ fontSize: 20 }} />, path: '/admin/deals', key: 'deals' },
    { label: 'Product Size', icon: <Fastfood sx={{ fontSize: 20 }} />, path: '/admin/product-size', key: 'product-size' },
    { label: 'Reports', icon: <BarChart sx={{ fontSize: 20 }} />, path: '/admin/reports', key: 'reports' },
    { label: 'Settings', icon: <Settings sx={{ fontSize: 20 }} />, path: '/admin/settings', key: 'settings' },
  ];

  const isActive = (path: string): boolean => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    navigate('/login');
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          bgcolor: '#f8f5ff',
          borderRight: 'none',
          boxShadow: 'none',
        },
      }}
    >
      {/* Logo */}
      <Box sx={{ p: 2, pt: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              bgcolor: '#FF6B35',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: 18,
            }}
          >
            E
          </Box>
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#333', fontSize: 20 }}>
          eatzilla
        </Typography>
      </Box>

      <Divider sx={{ mx: 2, my: 1, borderColor: 'rgba(0,0,0,0.06)' }} />

      {/* All Menu Items */}
      <List sx={{ pt: 1, px: 1.5, overflow: 'auto', flex: 1 }}>
        {menuItems.map(item => (
          <ListItemButton
            key={item.key}
            onClick={() => navigate(item.path)}
            sx={{
              bgcolor: isActive(item.path) ? '#FFE8E0' : 'transparent',
              color: isActive(item.path) ? '#FF6B35' : '#666',
              borderRadius: 2,
              mb: 0.5,
              py: 1,
              px: 1.5,
              '&:hover': {
                bgcolor: isActive(item.path) ? '#FFE8E0' : 'rgba(255, 107, 53, 0.08)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <ListItemIcon 
              sx={{ 
                color: 'inherit', 
                minWidth: 36,
                '& svg': { fontSize: 20 }
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                sx: {
                  fontWeight: isActive(item.path) ? 600 : 500,
                  fontSize: 14,
                  color: 'inherit',
                },
              }}
            />
          </ListItemButton>
        ))}
      </List>

      {/* Logout Button */}
      <Divider sx={{ mx: 2, my: 1, borderColor: 'rgba(0,0,0,0.06)' }} />
      <List sx={{ pt: 0, px: 1.5, pb: 2 }}>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            color: '#666',
            borderRadius: 2,
            py: 1,
            px: 1.5,
            '&:hover': {
              bgcolor: 'rgba(255, 107, 53, 0.08)',
              color: '#FF6B35',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
            <Logout sx={{ fontSize: 20 }} />
          </ListItemIcon>
          <ListItemText 
            primary="Logout" 
            primaryTypographyProps={{
              sx: { fontWeight: 500, fontSize: 14 }
            }}
          />
        </ListItemButton>
      </List>
    </Drawer>
  );
};

export default AdminSidebar;
