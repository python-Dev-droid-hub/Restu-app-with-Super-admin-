import { Card, CardContent, Typography, Box } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { saas } from './superAdminTokens';

export default function MetricCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: 'primary' | 'success' | 'warning' | 'info';
}) {
  const accentColor =
    accent === 'success' ? '#4CAF50'
      : accent === 'warning' ? '#FF9800'
        : accent === 'info' ? '#2196F3'
          : saas.colors.primary;

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: `1px solid ${saas.colors.cardBorder}`,
        borderRadius: `${saas.radius.md}px`,
        boxShadow: saas.shadow.card,
        position: 'relative',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s, transform 0.2s',
        '&:hover': {
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          bgcolor: accentColor,
        }}
      />
      <CardContent sx={{ pl: 2.5, py: 2.5 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={500} fontSize={13}>
          {title}
        </Typography>
        <Typography
          variant="h4"
          fontWeight={600}
          color={saas.colors.textDark}
          mt={0.5}
          letterSpacing="-0.01em"
          sx={{ fontSize: { xs: '1.25rem', sm: '1.75rem' } }}
        >
          {value}
        </Typography>
        {subtitle && (
          <Box display="flex" alignItems="center" gap={0.5} mt={1}>
            <TrendingUpIcon sx={{ fontSize: 14, color: accentColor }} />
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
