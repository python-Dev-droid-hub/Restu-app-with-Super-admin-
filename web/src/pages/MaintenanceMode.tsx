import { Box, Typography, Paper } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';

export default function MaintenanceMode() {
  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="#f5f6fa" p={2}>
      <Paper sx={{ p: 4, maxWidth: 480, textAlign: 'center' }}>
        <BuildIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} mb={1}>Under Maintenance</Typography>
        <Typography color="text.secondary">
          The platform is temporarily unavailable while we perform scheduled maintenance. Please try again shortly.
        </Typography>
      </Paper>
    </Box>
  );
}
