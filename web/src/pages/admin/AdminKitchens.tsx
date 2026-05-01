import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const AdminKitchens: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, pb: { xs: 2, md: 3 }, pt: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin/dashboard')}>
          Back
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Kitchens Management
        </Typography>
      </Box>
      <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: 'white', borderRadius: 2, boxShadow: 1 }}>
        <Typography color="textSecondary">
          Kitchens management page - Coming soon
        </Typography>
      </Box>
    </Box>
  );
};

export default AdminKitchens;
