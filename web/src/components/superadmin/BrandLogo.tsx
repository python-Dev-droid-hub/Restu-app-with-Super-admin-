import { Box, Typography, alpha } from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import { saas } from './superAdminTokens';

type Props = {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
  showTagline?: boolean;
};

const sizes = {
  sm: { icon: 36, font: '1rem', sub: 10 },
  md: { icon: 44, font: '1.25rem', sub: 11 },
  lg: { icon: 52, font: '1.5rem', sub: 12 },
};

export default function BrandLogo({ size = 'md', variant = 'dark', showTagline = true }: Props) {
  const s = sizes[size];
  const isLight = variant === 'light';

  return (
    <Box display="flex" alignItems="center" gap={1.5}>
      <Box
        sx={{
          width: s.icon,
          height: s.icon,
          borderRadius: `${saas.radius.md}px`,
          background: `linear-gradient(145deg, ${saas.colors.primary} 0%, ${saas.colors.primaryDark} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isLight
            ? '0 4px 14px rgba(250, 74, 12, 0.35)'
            : `0 4px 20px ${alpha(saas.colors.primary, 0.45)}`,
          flexShrink: 0,
        }}
      >
        <RestaurantIcon sx={{ color: '#fff', fontSize: s.icon * 0.55 }} />
      </Box>
      <Box>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: s.font,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            color: isLight ? '#fff' : saas.colors.textDark,
          }}
        >
          {saas.brand.name}
        </Typography>
        {showTagline && (
          <Typography
            sx={{
              fontSize: s.sub,
              fontWeight: 500,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: isLight ? alpha('#fff', 0.72) : saas.colors.textMuted,
              mt: 0.25,
            }}
          >
            {saas.brand.console}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
