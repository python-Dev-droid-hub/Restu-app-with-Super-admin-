import { Alert, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { clearAuthSession } from '../utils/authStorage';

export default function ImpersonationBanner() {
  const navigate = useNavigate();
  const impersonating = localStorage.getItem('impersonating') === 'true';
  if (!impersonating) return null;

  const exit = async () => {
    try {
      await api.post('/auth/exit-impersonate');
    } catch {
      /* ignore */
    }
    clearAuthSession();
    localStorage.removeItem('impersonating');
    localStorage.removeItem('impersonationTenantId');
    navigate('/superadmin/tenants');
  };

  return (
    <Alert
      severity="warning"
      sx={{
        borderRadius: 0,
        position: 'sticky',
        top: 0,
        zIndex: 1200,
        px: { xs: 1.5, sm: 2 },
        py: { xs: 1, sm: 1.25 },
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        '& .MuiAlert-message': { width: '100%', pr: { xs: 0, sm: 1 } },
        '& .MuiAlert-action': {
          alignItems: 'center',
          ml: { xs: 0, sm: 2 },
          mt: { xs: 1, sm: 0 },
          pl: 0,
          mr: 0,
          width: { xs: '100%', sm: 'auto' },
        },
      }}
      action={
        <Button
          color="inherit"
          size="small"
          onClick={exit}
          sx={{ whiteSpace: 'nowrap', fontWeight: 600, width: { xs: '100%', sm: 'auto' } }}
        >
          Exit Impersonation
        </Button>
      }
    >
      <Box component="span" sx={{ display: 'block', lineHeight: 1.45, fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}>
        You are viewing this tenant as an impersonated admin. Changes are real.
      </Box>
    </Alert>
  );
}
