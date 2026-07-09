import React, { useEffect, useState } from 'react';
import { Box, useTheme } from '@mui/material';
import AdminSidebar from './AdminSidebar';
import AdminTopBar from './AdminTopBar';
import ImpersonationBanner from '../ImpersonationBanner';
import { useAdminBreakpoints } from '../../utils/adminResponsive';

const SIDEBAR_WIDTH = 260;
const TOPBAR_HEIGHT = 64;

const Sidebar = AdminSidebar as React.ComponentType<{
  mode?: 'admin' | 'manager' | 'chef' | 'waiter' | 'rider';
  variant?: 'permanent' | 'temporary';
  open?: boolean;
  onClose?: () => void;
}>;
const TopBar = AdminTopBar as React.ComponentType<{
  mode?: 'admin' | 'manager' | 'chef' | 'waiter' | 'rider';
  isMobile?: boolean;
  onMenuClick?: () => void;
}>;

interface AdminLayoutProps {
  children: React.ReactNode;
  mode?: 'admin' | 'manager' | 'chef' | 'waiter' | 'rider';
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, mode = 'admin' }) => {
  const theme = useTheme();
  const { isDrawerLayout } = useAdminBreakpoints();
  const isMobile = isDrawerLayout;
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isMobile && mobileOpen) setMobileOpen(false);
  }, [isMobile, mobileOpen]);

  const handleMenuClick = () => {
    setMobileOpen((prev) => !prev);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      {isMobile ? (
        <Sidebar
          mode={mode}
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
      ) : (
        <Box
          sx={{
            width: SIDEBAR_WIDTH,
            position: 'fixed',
            height: '100vh',
            overflow: 'auto',
            zIndex: 200,
          }}
        >
          <Sidebar mode={mode} />
        </Box>
      )}

      {/* Main Content Area */}
      <Box
        sx={{
          marginLeft: isMobile ? 0 : `${SIDEBAR_WIDTH}px`,
          width: isMobile ? '100%' : `calc(100% - ${SIDEBAR_WIDTH}px)`,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        {/* Top Bar */}
        <Box sx={{ height: TOPBAR_HEIGHT, zIndex: 100 }}>
          <TopBar mode={mode} isMobile={isMobile} onMenuClick={handleMenuClick} />
        </Box>
        <ImpersonationBanner />

        {/* Page Content */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            bgcolor: theme.palette.primary.light,
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
