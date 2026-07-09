import { Box, Typography, Breadcrumbs, Link, alpha } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { saas } from './superAdminTokens';

type Crumb = { label: string; to?: string };

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  action,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  action?: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        mb: 3,
        pb: 2.5,
        borderBottom: `1px solid ${saas.colors.cardBorder}`,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: { xs: 'flex-start', sm: 'flex-end' },
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Box sx={{ minWidth: 0, flex: { xs: '1 1 100%', sm: '1 1 auto' } }}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs sx={{ mb: 1.25, fontSize: 13 }} aria-label="breadcrumb">
            {breadcrumbs.map((c, i) =>
              c.to && i < breadcrumbs.length - 1 ? (
                <Link
                  key={c.label}
                  component={RouterLink}
                  to={c.to}
                  underline="hover"
                  sx={{ fontSize: 13, color: saas.colors.textMuted, fontWeight: 500 }}
                >
                  {c.label}
                </Link>
              ) : (
                <Typography key={c.label} sx={{ fontSize: 13, color: alpha(saas.colors.textMuted, 0.8), fontWeight: 500 }}>
                  {c.label}
                </Typography>
              )
            )}
          </Breadcrumbs>
        )}
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            color: saas.colors.textDark,
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
            fontSize: { xs: 20, sm: 22 },
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" mt={0.75} maxWidth={560} lineHeight={1.65}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ flexShrink: 0, pb: 0.25, width: { xs: '100%', sm: 'auto' } }}>{action}</Box>}
    </Box>
  );
}
