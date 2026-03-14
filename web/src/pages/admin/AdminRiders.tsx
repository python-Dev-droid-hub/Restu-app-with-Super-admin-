import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const AdminRiders: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin/dashboard')}>
          Back
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Riders Management
        </Typography>
      </Box>
      <Box sx={{ p: 4, bgcolor: 'white', borderRadius: 2, boxShadow: 1 }}>
        <Typography color="textSecondary">
          Riders management page - Coming soon
        </Typography>
      </Box>
    </Box>
  );
};

export default AdminRiders;
