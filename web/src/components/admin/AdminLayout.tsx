import React from 'react';
import { Box } from '@mui/material';
import AdminSidebar from './AdminSidebar';
import AdminTopBar from './AdminTopBar';

const SIDEBAR_WIDTH = 260;
const TOPBAR_HEIGHT = 64;

const Sidebar = AdminSidebar as React.ComponentType<{ mode?: 'admin' | 'manager' | 'chef' }>;
const TopBar = AdminTopBar as React.ComponentType<{ mode?: 'admin' | 'manager' | 'chef' }>;

interface AdminLayoutProps {
  children: React.ReactNode;
  mode?: 'admin' | 'manager' | 'chef';
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, mode = 'admin' }) => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
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

      {/* Main Content Area */}
      <Box
        sx={{
          marginLeft: `${SIDEBAR_WIDTH}px`,
          width: `calc(100% - ${SIDEBAR_WIDTH}px)`,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        {/* Top Bar */}
        <Box sx={{ height: TOPBAR_HEIGHT, zIndex: 100 }}>
          <TopBar mode={mode} />
        </Box>

        {/* Page Content */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            bgcolor: '#f8f5ff',
            mt: `${TOPBAR_HEIGHT}px`,
            width: '100%',
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
