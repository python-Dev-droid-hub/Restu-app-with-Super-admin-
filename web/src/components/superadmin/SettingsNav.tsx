import { NavLink } from 'react-router-dom';
import { Box, Typography, alpha } from '@mui/material';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { saas } from './superAdminTokens';

const ITEMS = [
  {
    to: '/superadmin/settings',
    end: true,
    label: 'General',
    icon: TuneOutlinedIcon,
  },
  {
    to: '/superadmin/settings/email-templates',
    end: false,
    label: 'Email templates',
    icon: EmailOutlinedIcon,
  },
  {
    to: '/superadmin/settings/team',
    end: false,
    label: 'Team & access',
    icon: GroupsOutlinedIcon,
  },
] as const;

export default function SettingsNav() {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{
          px: 1.25,
          py: 0.75,
          display: 'block',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: saas.colors.textMuted,
          fontSize: 10,
        }}
      >
        Settings
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {ITEMS.map(({ to, end, label, icon: Icon }) => (
          <Box
            key={to}
            component={NavLink}
            to={to}
            end={end}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              px: 1.25,
              py: 1.1,
              borderRadius: `${saas.radius.sm}px`,
              textDecoration: 'none',
              color: saas.colors.textDark,
              position: 'relative',
              transition: 'background-color 0.15s',
              '&:hover': { bgcolor: alpha(saas.colors.primary, 0.06) },
              '&.active': {
                bgcolor: alpha(saas.colors.primary, 0.1),
                color: saas.colors.primary,
                fontWeight: 700,
                '& .settings-nav-chevron': { opacity: 1 },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 8,
                  bottom: 8,
                  width: 3,
                  borderRadius: 99,
                  bgcolor: saas.colors.primary,
                },
              },
            }}
          >
            <Icon sx={{ fontSize: 18, opacity: 0.85 }} />
            <Typography variant="body2" fontWeight="inherit" flex={1} lineHeight={1.3}>
              {label}
            </Typography>
            <ChevronRightIcon
              className="settings-nav-chevron"
              sx={{ fontSize: 16, opacity: 0, color: 'inherit', transition: 'opacity 0.15s' }}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
