import { alpha } from '@mui/material';
import { saas } from './superAdminTokens';

/** Consistent form field styling for super admin pages */
export const saasTextFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: `${saas.radius.md}px`,
    bgcolor: '#fff',
    transition: 'box-shadow 0.2s, border-color 0.2s',
    '& fieldset': {
      borderColor: saas.colors.cardBorder,
    },
    '&:hover fieldset': {
      borderColor: alpha(saas.colors.primary, 0.45),
    },
    '&.Mui-focused fieldset': {
      borderColor: saas.colors.primary,
      borderWidth: 1.5,
    },
    '&.Mui-focused': {
      boxShadow: `0 0 0 3px ${alpha(saas.colors.primary, 0.12)}`,
    },
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: saas.colors.primary,
    fontWeight: 600,
  },
};

export const saasPanelPattern = {
  position: 'absolute' as const,
  inset: 0,
  opacity: 0.04,
  backgroundImage: `radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)`,
  backgroundSize: '28px 28px',
  pointerEvents: 'none' as const,
};
