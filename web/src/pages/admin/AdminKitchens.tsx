import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PlanFeatureGate } from '../../components/admin/PlanFeatureGate';
import { useAdminPageStyles } from '../../utils/adminResponsive';

const AdminKitchens: React.FC = () => {
  const navigate = useNavigate();
  const { page, titleSx, theme } = useAdminPageStyles();

  return (
    <PlanFeatureGate feature="kitchen_display" featureLabel="Kitchen management">
      <Box sx={{ ...page, bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin/dashboard')}>
            Back
          </Button>
          <Typography variant="h5" sx={titleSx}>
            Kitchens Management
          </Typography>
        </Box>
        <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: 'white', borderRadius: 2, boxShadow: 1 }}>
          <Typography color="textSecondary">
            Kitchens management page - Coming soon
          </Typography>
        </Box>
      </Box>
    </PlanFeatureGate>
  );
};

export default AdminKitchens;
