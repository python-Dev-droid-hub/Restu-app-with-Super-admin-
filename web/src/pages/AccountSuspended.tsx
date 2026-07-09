import { Box, Button, Typography, Paper } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import { clearAuthSession } from '../utils/authStorage';

export default function AccountSuspended() {
  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="#f5f6fa" p={2}>
      <Paper sx={{ p: 4, maxWidth: 480, textAlign: 'center' }}>
        <BlockIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} mb={1}>Account Suspended</Typography>
        <Typography color="text.secondary" mb={3}>
          This restaurant account has been suspended. Please contact platform support for assistance.
        </Typography>
        <Button variant="contained" onClick={() => { clearAuthSession(); window.location.href = '/login'; }}>
          Back to Login
        </Button>
      </Paper>
    </Box>
  );
}
