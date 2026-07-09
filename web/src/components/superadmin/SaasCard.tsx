import type { ReactNode } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { saas } from './superAdminTokens';

export default function SaasCard({
  title,
  subtitle,
  action,
  children,
  noPadding,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  noPadding?: boolean;
}) {
  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${saas.colors.cardBorder}`,
        boxShadow: saas.shadow.card,
        borderRadius: `${saas.radius.md}px`,
        overflow: 'hidden',
      }}
    >
      {(title || action) && (
        <Box
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: { xs: 1.5, sm: 2 },
            borderBottom: `1px solid ${saas.colors.cardBorder}`,
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            bgcolor: '#fff',
          }}
        >
          <Box>
            {title && (
              <Typography variant="subtitle1" fontWeight={600} color={saas.colors.textDark}>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Box>
      )}
      {noPadding ? (
        children
      ) : (
        <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
          {children}
        </CardContent>
      )}
    </Card>
  );
}
