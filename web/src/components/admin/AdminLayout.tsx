import React from 'react';
import { Box } from '@mui/material';
import AdminSidebar from './AdminSidebar';
import AdminTopBar from './AdminTopBar';

const SIDEBAR_WIDTH = 260;
const TOPBAR_HEIGHT = 64;

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
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
        <AdminSidebar />
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
          <AdminTopBar />
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
