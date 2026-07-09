import type { ReactNode } from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { saas } from './superAdminTokens';

const SIDEBAR_WIDTH = 300;

export function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        mb: 3,
        p: { xs: 2.5, md: 3 },
        borderRadius: `${saas.radius.lg}px`,
        border: `1px solid ${saas.colors.cardBorder}`,
        bgcolor: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <Box mb={2.5}>
        <Typography variant="subtitle1" fontWeight={800} letterSpacing="-0.02em" color={saas.colors.textDark}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" lineHeight={1.65} mt={0.5}>
            {description}
          </Typography>
        )}
      </Box>
      {children}
    </Box>
  );
}

export function SettingsRow({
  label,
  hint,
  children,
  alignTop,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  alignTop?: boolean;
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '200px 1fr' },
        gap: { xs: 1, lg: 3 },
        py: 2,
        borderTop: `1px solid ${saas.colors.cardBorder}`,
        alignItems: alignTop ? 'flex-start' : 'center',
        '&:first-of-type': { borderTop: 'none', pt: 0 },
      }}
    >
      <Box>
        <Typography variant="body2" fontWeight={700} color={saas.colors.textDark} lineHeight={1.4}>
          {label}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary" lineHeight={1.55} display="block" mt={0.5}>
            {hint}
          </Typography>
        )}
      </Box>
      <Box sx={{ minWidth: 0, width: '100%', maxWidth: { lg: 520 } }}>{children}</Box>
    </Box>
  );
}

export { SIDEBAR_WIDTH };
