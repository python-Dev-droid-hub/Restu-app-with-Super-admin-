import type { ReactNode } from 'react';
import { Box, Chip, Grid, Typography, alpha } from '@mui/material';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import { saas } from './superAdminTokens';

const panelHeadline = '#FFFFFF';
const panelBody = 'rgba(255, 255, 255, 0.82)';
const panelMuted = 'rgba(255, 255, 255, 0.58)';
const panelGlass = 'rgba(255, 255, 255, 0.09)';
const panelGlassBorder = 'rgba(255, 255, 255, 0.16)';

export type SaasHeroStat = {
  label: string;
  value: string | number;
  accent?: string;
};

export type SaasHeroHighlight = {
  label: string;
  value: string;
};

export type SaasHeroTrend = {
  label: string;
  positive?: boolean;
};

function HeroStat({ label, value, accent }: SaasHeroStat) {
  return (
    <Box
      sx={{
        p: 2,
        height: '100%',
        borderRadius: `${saas.radius.md}px`,
        bgcolor: panelGlass,
        border: `1px solid ${panelGlassBorder}`,
        backdropFilter: 'blur(12px)',
        transition: 'border-color 0.2s, transform 0.2s',
        '&:hover': {
          borderColor: alpha(accent || saas.colors.primary, 0.45),
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: panelMuted,
          fontWeight: 500,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          fontSize: 11,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="h5"
        sx={{
          color: panelHeadline,
          fontWeight: 600,
          mt: 0.5,
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
        }}
      >
        {value}
      </Typography>
      {accent && (
        <Box sx={{ width: 28, height: 3, borderRadius: 99, bgcolor: accent, mt: 1.25 }} />
      )}
    </Box>
  );
}

export default function SaasHeroBanner({
  badgeIcon,
  badgeLabel,
  headline,
  description,
  highlight,
  trend,
  stats = [],
}: {
  badgeIcon: ReactNode;
  badgeLabel: string;
  headline: string;
  description: string;
  highlight?: SaasHeroHighlight;
  trend?: SaasHeroTrend;
  stats?: SaasHeroStat[];
}) {
  const showStats = stats.length > 0;

  return (
    <Box
      sx={{
        mb: 3,
        borderRadius: `${saas.radius.lg}px`,
        overflow: 'hidden',
        border: `1px solid ${alpha(saas.colors.primary, 0.22)}`,
        boxShadow: saas.shadow.elevated,
        position: 'relative',
        bgcolor: saas.colors.sidebar,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -80,
          right: -40,
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(saas.colors.primary, 0.35)} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.05,
          backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
          backgroundSize: '22px 22px',
          pointerEvents: 'none',
        }}
      />

      <Grid container sx={{ position: 'relative' }}>
        <Grid
          size={{ xs: 12, lg: showStats ? 7 : 12 }}
          sx={{
            p: { xs: 3, md: 4 },
            borderRight: showStats ? { lg: `1px solid ${panelGlassBorder}` } : undefined,
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.75,
              mb: 2,
              borderRadius: 99,
              bgcolor: alpha(saas.colors.primary, 0.18),
              border: `1px solid ${alpha(saas.colors.primary, 0.35)}`,
            }}
          >
            <Box sx={{ display: 'flex', color: saas.colors.primary, fontSize: 18 }}>{badgeIcon}</Box>
            <Typography
              variant="caption"
              sx={{ color: panelBody, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
              {badgeLabel}
            </Typography>
          </Box>

          <Typography
            variant="h2"
            sx={{
              color: panelHeadline,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              fontSize: { xs: '2rem', md: '2.5rem' },
            }}
          >
            {headline}
          </Typography>

          <Typography variant="body1" sx={{ color: panelBody, mt: 1.5, maxWidth: 480 }}>
            {description}
          </Typography>

          {(highlight || trend) && (
            <Box display="flex" flexWrap="wrap" alignItems="center" gap={1.5} mt={2.5}>
              {highlight && (
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: `${saas.radius.md}px`,
                    bgcolor: panelGlass,
                    border: `1px solid ${panelGlassBorder}`,
                  }}
                >
                  <Typography variant="caption" sx={{ color: panelMuted, display: 'block' }}>
                    {highlight.label}
                  </Typography>
                  <Typography sx={{ color: panelHeadline, fontWeight: 600 }}>{highlight.value}</Typography>
                </Box>
              )}
              {trend && (
                <Chip
                  size="small"
                  icon={
                    trend.positive !== false ? (
                      <TrendingUpOutlinedIcon sx={{ fontSize: '16px !important', color: '#81C784 !important' }} />
                    ) : (
                      <TrendingDownOutlinedIcon sx={{ fontSize: '16px !important', color: '#EF9A9A !important' }} />
                    )
                  }
                  label={trend.label}
                  sx={{
                    height: 36,
                    px: 0.5,
                    bgcolor: alpha(trend.positive !== false ? '#4CAF50' : '#F44336', 0.16),
                    color: panelHeadline,
                    fontWeight: 500,
                    border: `1px solid ${alpha(trend.positive !== false ? '#4CAF50' : '#F44336', 0.35)}`,
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
              )}
            </Box>
          )}
        </Grid>

        {showStats && (
          <Grid size={{ xs: 12, lg: 5 }} sx={{ p: { xs: 3, md: 3 }, bgcolor: alpha('#000', 0.18) }}>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              {stats.map((stat) => (
                <Grid key={stat.label} size={{ xs: 6, sm: stats.length === 3 ? 4 : 6 }}>
                  <HeroStat {...stat} />
                </Grid>
              ))}
            </Grid>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
