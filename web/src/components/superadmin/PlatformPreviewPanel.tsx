import { useEffect, useState, type ReactNode } from 'react';
import { Box, Chip, Typography, alpha } from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import { saas } from './superAdminTokens';

type Props = {
  platformName: string;
  logoUrl?: string;
  supportEmail?: string;
  supportPhone?: string;
  maintenanceMode?: boolean;
  trialDays?: number;
  currency?: string;
  defaultPlan?: string;
  isLive?: boolean;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) || 'RH').toUpperCase();
}

function PreviewCard({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        borderRadius: `${saas.radius.md}px`,
        border: `1px solid ${saas.colors.cardBorder}`,
        overflow: 'hidden',
        bgcolor: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          bgcolor: alpha(saas.colors.textMuted, 0.04),
          borderBottom: `1px solid ${saas.colors.cardBorder}`,
        }}
      >
        <Box sx={{ color: saas.colors.primary, display: 'flex', alignItems: 'center' }}>{icon}</Box>
        <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing="0.02em">
          {label}
        </Typography>
      </Box>
      <Box sx={{ p: 1.75 }}>{children}</Box>
    </Box>
  );
}

function BrandAvatar({ name, logoUrl }: { name: string; logoUrl?: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [logoUrl]);

  const showLogo = Boolean(logoUrl?.trim()) && !failed;

  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: '10px',
        flexShrink: 0,
        overflow: 'hidden',
        bgcolor: saas.colors.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 800,
        fontSize: 13,
        boxShadow: `0 4px 12px ${alpha(saas.colors.primary, 0.35)}`,
      }}
    >
      {showLogo ? (
        <Box
          component="img"
          src={logoUrl}
          alt=""
          onError={() => setFailed(true)}
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        initials(name)
      )}
    </Box>
  );
}

function ClampedText({
  children,
  lines = 2,
  weight = 700,
  size = 'body2',
}: {
  children: ReactNode;
  lines?: number;
  weight?: number;
  size?: 'body2' | 'caption' | 'subtitle2';
}) {
  return (
    <Typography
      variant={size}
      sx={{
        fontWeight: weight,
        lineHeight: 1.4,
        display: '-webkit-box',
        WebkitLineClamp: lines,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        wordBreak: 'break-word',
      }}
    >
      {children}
    </Typography>
  );
}

export default function PlatformPreviewPanel({
  platformName,
  logoUrl,
  supportEmail,
  supportPhone,
  maintenanceMode,
  trialDays = 14,
  currency = 'PKR',
  defaultPlan,
  isLive,
}: Props) {
  const displayName = platformName?.trim() || 'Restaurant SaaS Platform';
  const hasPlan = defaultPlan && defaultPlan !== 'None';

  return (
    <Box
      sx={{
        borderRadius: `${saas.radius.lg}px`,
        overflow: 'hidden',
        border: `1px solid ${saas.colors.cardBorder}`,
        boxShadow: saas.shadow.elevated,
        bgcolor: '#fff',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 2,
          background: saas.colors.panelBg,
          borderBottom: `1px solid ${saas.colors.panelCardBorder}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.05,
            backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
            backgroundSize: '20px 20px',
            pointerEvents: 'none',
          }}
        />
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={1} position="relative">
          <Box display="flex" alignItems="center" gap={0.75}>
            <AutoAwesomeOutlinedIcon sx={{ fontSize: 16, color: saas.colors.primary }} />
            <Typography
              variant="caption"
              sx={{
                color: saas.colors.panelHeadline,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontSize: 10,
              }}
            >
              Live preview
            </Typography>
            {isLive && (
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: '#4CAF50',
                  boxShadow: '0 0 6px #4CAF50',
                  animation: 'pulse 1.8s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.4 },
                  },
                }}
              />
            )}
          </Box>
          <Chip
            size="small"
            icon={
              maintenanceMode ? (
                <ErrorOutlineIcon sx={{ fontSize: '14px !important' }} />
              ) : (
                <CheckCircleOutlineIcon sx={{ fontSize: '14px !important' }} />
              )
            }
            label={maintenanceMode ? 'Maintenance' : 'Operational'}
            sx={{
              height: 24,
              fontSize: 11,
              fontWeight: 700,
              bgcolor: maintenanceMode ? alpha('#FF9800', 0.18) : alpha('#4CAF50', 0.18),
              color: maintenanceMode ? '#FFB74D' : '#81C784',
              border: `1px solid ${maintenanceMode ? alpha('#FF9800', 0.35) : alpha('#4CAF50', 0.35)}`,
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
        </Box>
        <Typography variant="caption" sx={{ color: saas.colors.panelMuted, mt: 0.75, display: 'block', position: 'relative' }}>
          See how tenants experience your brand
        </Typography>
      </Box>

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Email mock */}
        <PreviewCard label="Email header" icon={<EmailOutlinedIcon sx={{ fontSize: 15 }} />}>
          <Box
            sx={{
              borderRadius: 1,
              border: `1px solid ${saas.colors.cardBorder}`,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                px: 1.5,
                py: 1,
                bgcolor: alpha(saas.colors.primary, 0.07),
                borderBottom: `1px solid ${alpha(saas.colors.primary, 0.1)}`,
              }}
            >
              <Typography variant="caption" color="text.secondary" fontSize={10}>
                Subject: Welcome to {displayName}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
              <BrandAvatar name={displayName} logoUrl={logoUrl} />
              <Box minWidth={0} flex={1}>
                <ClampedText lines={2} size="body2">
                  {displayName}
                </ClampedText>
                <Typography variant="caption" color="text.secondary" fontSize={10} mt={0.25} display="block">
                  Platform notification
                </Typography>
              </Box>
            </Box>
          </Box>
        </PreviewCard>

        {/* Browser login mock */}
        <PreviewCard label="Tenant login" icon={<LanguageOutlinedIcon sx={{ fontSize: 15 }} />}>
          <Box
            sx={{
              borderRadius: 1,
              border: `1px solid ${saas.colors.cardBorder}`,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                px: 1.25,
                py: 0.75,
                bgcolor: alpha(saas.colors.textMuted, 0.06),
                borderBottom: `1px solid ${saas.colors.cardBorder}`,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
                <Box key={c} sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: c }} />
              ))}
              <Box
                sx={{
                  flex: 1,
                  mx: 0.5,
                  height: 14,
                  borderRadius: 99,
                  bgcolor: '#fff',
                  border: `1px solid ${saas.colors.cardBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  px: 1,
                }}
              >
                <Typography variant="caption" color="text.disabled" fontSize={9} noWrap>
                  app.yourapp.com/login
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                p: 2,
                background: `linear-gradient(180deg, ${alpha(saas.colors.primary, 0.06)} 0%, #fff 70%)`,
              }}
            >
              <Box display="flex" justifyContent="center" mb={1.5}>
                <BrandAvatar name={displayName} logoUrl={logoUrl} />
              </Box>
              <Typography variant="subtitle2" fontWeight={800} textAlign="center" mb={0.25}>
                Welcome back
              </Typography>
              <ClampedText lines={2} weight={400} size="caption">
                Sign in to your {displayName} dashboard
              </ClampedText>
              <Box
                mt={1.5}
                sx={{
                  height: 30,
                  borderRadius: 1,
                  bgcolor: '#fff',
                  border: `1px solid ${saas.colors.cardBorder}`,
                }}
              />
              <Box
                mt={1}
                sx={{
                  height: 30,
                  borderRadius: 1,
                  bgcolor: saas.colors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, fontSize: 11 }}>
                  Sign in
                </Typography>
              </Box>
            </Box>
          </Box>
        </PreviewCard>

        {/* Tenant details */}
        <PreviewCard label="Tenant-facing info" icon={<PhoneOutlinedIcon sx={{ fontSize: 15 }} />}>
          <Box display="flex" flexDirection="column" gap={1.25}>
            <Box display="flex" alignItems="flex-start" gap={1}>
              <EmailOutlinedIcon sx={{ fontSize: 16, color: saas.colors.primary, mt: 0.15 }} />
              <Box minWidth={0}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.15}>
                  Support email
                </Typography>
                <ClampedText lines={2} weight={500} size="caption">
                  {supportEmail?.trim() || 'Not configured'}
                </ClampedText>
              </Box>
            </Box>

            {supportPhone?.trim() && (
              <Box display="flex" alignItems="flex-start" gap={1}>
                <PhoneOutlinedIcon sx={{ fontSize: 16, color: saas.colors.primary, mt: 0.15 }} />
                <Box minWidth={0}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.15}>
                    Support phone
                  </Typography>
                  <Typography variant="caption" fontWeight={500}>
                    {supportPhone}
                  </Typography>
                </Box>
              </Box>
            )}

            <Box display="flex" flexWrap="wrap" gap={0.75} pt={0.5}>
              <Chip
                size="small"
                label={`${trialDays}-day trial`}
                sx={{
                  height: 22,
                  fontSize: 10,
                  fontWeight: 700,
                  bgcolor: alpha(saas.colors.primary, 0.1),
                  color: saas.colors.primary,
                  border: `1px solid ${alpha(saas.colors.primary, 0.2)}`,
                }}
              />
              <Chip
                size="small"
                label={currency}
                sx={{
                  height: 22,
                  fontSize: 10,
                  fontWeight: 700,
                  bgcolor: alpha('#2196F3', 0.1),
                  color: '#1976D2',
                  border: `1px solid ${alpha('#2196F3', 0.2)}`,
                }}
              />
              {hasPlan && (
                <Chip
                  size="small"
                  label={defaultPlan}
                  sx={{
                    height: 22,
                    fontSize: 10,
                    fontWeight: 700,
                    maxWidth: '100%',
                    bgcolor: alpha('#4CAF50', 0.1),
                    color: '#388E3C',
                    border: `1px solid ${alpha('#4CAF50', 0.2)}`,
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  }}
                />
              )}
            </Box>
          </Box>
        </PreviewCard>
      </Box>
    </Box>
  );
}
