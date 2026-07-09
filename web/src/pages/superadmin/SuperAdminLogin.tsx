import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, Typography, Alert, Paper, Stack, alpha,
  InputAdornment, IconButton, CircularProgress, Divider,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import axios from 'axios';
import { resolveApiBaseUrl } from '../../utils/resolveApiBaseUrl';
import { setSuperAdminSession, hasSuperAdminSession } from '../../utils/superAdminAuthStorage';
import { saas } from '../../components/superadmin/superAdminTokens';
import BrandLogo from '../../components/superadmin/BrandLogo';
import { saasPanelPattern, saasTextFieldSx } from '../../components/superadmin/superAdminFormStyles';

const highlights = [
  {
    icon: <StorefrontOutlinedIcon fontSize="small" />,
    title: 'Multi-tenant restaurants',
    desc: 'Launch, configure, and monitor every restaurant from a single control plane.',
  },
  {
    icon: <InsightsOutlinedIcon fontSize="small" />,
    title: 'Revenue & usage analytics',
    desc: 'Track MRR, order volume, trial conversions, and plan limits in real time.',
  },
  {
    icon: <VerifiedUserOutlinedIcon fontSize="small" />,
    title: 'Enterprise-grade access',
    desc: 'Role-based permissions for billing, support, and onboarding teams.',
  },
];

export default function SuperAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (hasSuperAdminSession()) navigate('/superadmin/dashboard', { replace: true });
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const base = resolveApiBaseUrl();
      const url = `${base.replace(/\/$/, '')}/superadmin/auth/login`;
      const res = await axios.post(url, { email, password });
      const data = res.data?.data;
      if (!data?.tokens?.accessToken) {
        setError(res.data?.message || 'Login failed');
        return;
      }
      setSuperAdminSession(data.tokens.accessToken, data.tokens.refreshToken, data.superAdmin);
      navigate('/superadmin/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      if (!err.response) {
        setError('Cannot reach API server. Start the backend on port 3101 (npm run dev from repo root).');
      } else if (msg.toLowerCase().includes('invalid credentials')) {
        setError(
          `${msg} — If this is your first setup, seed a super admin: npm run seed:superadmin --prefix server`
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: saas.colors.pageBg }}>
      {/* Brand panel — explicit light text (do not inherit MUI dark theme colors) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: '0 0 46%',
          flexDirection: 'column',
          justifyContent: 'space-between',
          px: 6,
          py: 5,
          background: saas.colors.panelBg,
          color: saas.colors.panelHeadline,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ ...saasPanelPattern, opacity: 0.035 }} />
        <Box
          sx={{
            position: 'absolute',
            top: -100,
            right: -80,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(saas.colors.primary, 0.28)} 0%, transparent 68%)`,
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: 80,
            left: -40,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(saas.colors.primary, 0.14)} 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        <Box position="relative" zIndex={1}>
          <BrandLogo size="lg" variant="light" />
        </Box>

        <Box position="relative" zIndex={1} maxWidth={420}>
          <Typography
            component="h1"
            sx={{
              fontSize: { md: '2rem', lg: '2.35rem' },
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              mb: 2,
              color: saas.colors.panelHeadline,
            }}
          >
            Run your restaurant network at scale
          </Typography>
          <Typography
            sx={{
              fontSize: 15,
              lineHeight: 1.75,
              color: saas.colors.panelBody,
              fontWeight: 400,
            }}
          >
            The central command center for onboarding restaurants, managing subscriptions,
            resolving support, and monitoring platform health.
          </Typography>
        </Box>

        <Stack spacing={1.5} position="relative" zIndex={1}>
          {highlights.map((h) => (
            <Box
              key={h.title}
              sx={{
                display: 'flex',
                gap: 2,
                alignItems: 'flex-start',
                p: 2,
                borderRadius: `${saas.radius.md}px`,
                border: `1px solid ${saas.colors.panelCardBorder}`,
                bgcolor: saas.colors.panelCardBg,
                transition: 'background 0.2s, border-color 0.2s',
                '&:hover': {
                  bgcolor: saas.colors.panelCardHover,
                  borderColor: alpha(saas.colors.primary, 0.45),
                },
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: `${saas.radius.sm}px`,
                  background: `linear-gradient(145deg, ${saas.colors.primary} 0%, ${saas.colors.primaryDark} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0,
                  boxShadow: `0 4px 12px ${alpha(saas.colors.primary, 0.4)}`,
                }}
              >
                {h.icon}
              </Box>
              <Box>
                <Typography
                  fontWeight={600}
                  fontSize={14}
                  letterSpacing="-0.01em"
                  sx={{ color: saas.colors.panelHeadline }}
                >
                  {h.title}
                </Typography>
                <Typography sx={{ fontSize: 13, color: saas.colors.panelMuted, mt: 0.35, lineHeight: 1.55 }}>
                  {h.desc}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>

        <Typography
          position="relative"
          zIndex={1}
          sx={{ fontSize: 12, color: alpha('#fff', 0.42), letterSpacing: '0.02em' }}
        >
          © {new Date().getFullYear()} {saas.brand.name} · Authorized platform personnel only
        </Typography>
      </Box>

      {/* Form panel */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2.5, sm: 4 },
          background: `linear-gradient(180deg, ${saas.colors.pageBg} 0%, #fff 40%, ${saas.colors.pageBg} 100%)`,
        }}
      >
        <Box display={{ xs: 'flex', md: 'none' }} mb={3} width="100%" maxWidth={440}>
          <BrandLogo size="md" variant="dark" />
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4.5 },
            width: '100%',
            maxWidth: 440,
            border: `1px solid ${saas.colors.cardBorder}`,
            borderRadius: `${saas.radius.lg}px`,
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, letterSpacing: '-0.03em', color: saas.colors.textDark, mb: 0.75 }}
          >
            Welcome back
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3.5} lineHeight={1.6}>
            Sign in to your platform console to manage restaurants, billing, and system settings.
          </Typography>

          {error && (
            <Alert
              severity="error"
              variant="outlined"
              sx={{
                mb: 2.5,
                borderRadius: `${saas.radius.sm}px`,
                '& .MuiAlert-message': { fontSize: 14 },
              }}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2.25}>
              <TextField
                fullWidth
                label="Work email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                sx={saasTextFieldSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlinedIcon sx={{ fontSize: 20, color: saas.colors.textMuted }} />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                sx={saasTextFieldSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ fontSize: 20, color: saas.colors.textMuted }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={loading}
                sx={{
                  py: 1.35,
                  fontWeight: 700,
                  fontSize: 15,
                  mt: 0.5,
                  boxShadow: `0 4px 14px ${alpha(saas.colors.primary, 0.35)}`,
                  '&:hover': {
                    boxShadow: `0 6px 20px ${alpha(saas.colors.primary, 0.42)}`,
                  },
                }}
              >
                {loading ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  'Sign in to console'
                )}
              </Button>
            </Stack>
          </form>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              Platform access
            </Typography>
          </Divider>

          <Typography
            variant="caption"
            color="text.secondary"
            textAlign="center"
            display="block"
            lineHeight={1.6}
          >
            This area is restricted to {saas.brand.name} platform administrators.
            Restaurant staff should use{' '}
            <Typography component="a" href="/login" variant="caption" color="primary" sx={{ textDecoration: 'none' }}>
              /login
            </Typography>
            {' '}instead.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
