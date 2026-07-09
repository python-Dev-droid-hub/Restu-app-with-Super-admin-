import type { ReactNode } from 'react';
import type { SvgIconComponent } from '@mui/icons-material';
import { Box, Card, CardContent, Typography, alpha } from '@mui/material';
import { saas } from './superAdminTokens';

export default function SettingsSection({
  icon: Icon,
  accent = saas.colors.primary,
  title,
  subtitle,
  children,
  headerExtra,
}: {
  icon: SvgIconComponent;
  accent?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  headerExtra?: ReactNode;
}) {
  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${saas.colors.cardBorder}`,
        borderRadius: `${saas.radius.lg}px`,
        overflow: 'hidden',
        boxShadow: saas.shadow.card,
        transition: 'box-shadow 0.25s, border-color 0.25s',
        '&:hover': {
          boxShadow: saas.shadow.elevated,
          borderColor: alpha(accent, 0.22),
        },
      }}
    >
      <Box
        sx={{
          height: 3,
          background: `linear-gradient(90deg, ${accent} 0%, ${alpha(accent, 0.35)} 55%, transparent 100%)`,
        }}
      />
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          borderBottom: `1px solid ${saas.colors.cardBorder}`,
          background: `linear-gradient(135deg, ${alpha(accent, 0.04)} 0%, transparent 60%)`,
        }}
      >
        <Box display="flex" gap={1.75} alignItems="flex-start">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: `${saas.radius.md}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${alpha(accent, 0.18)} 0%, ${alpha(accent, 0.06)} 100%)`,
              border: `1px solid ${alpha(accent, 0.2)}`,
              color: accent,
              flexShrink: 0,
            }}
          >
            <Icon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} letterSpacing="-0.02em" color={saas.colors.textDark}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" lineHeight={1.55} display="block" mt={0.35}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {headerExtra}
      </Box>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>{children}</CardContent>
    </Card>
  );
}
