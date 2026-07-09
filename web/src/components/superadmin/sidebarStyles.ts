import { saas } from './superAdminTokens';

/** Custom scrollbar for dark sidebar nav */
export const sidebarNavScrollSx = {
  flex: 1,
  py: 1.5,
  px: 1.5,
  overflowY: 'auto' as const,
  scrollbarWidth: 'thin' as const,
  scrollbarColor: 'rgba(255,255,255,0.18) transparent',
  '&::-webkit-scrollbar': { width: 5 },
  '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
  '&::-webkit-scrollbar-thumb': {
    bgcolor: 'rgba(255,255,255,0.14)',
    borderRadius: 4,
  },
  '&::-webkit-scrollbar-thumb:hover': {
    bgcolor: 'rgba(255,255,255,0.24)',
  },
};

export const sidebarDrawerPaperSx = {
  width: saas.sidebarWidth,
  boxSizing: 'border-box' as const,
  position: 'fixed' as const,
  height: '100vh',
  bgcolor: saas.colors.sidebar,
  color: saas.colors.sidebarText,
  borderRight: `1px solid ${saas.colors.sidebarBorder}`,
  display: 'flex',
  flexDirection: 'column' as const,
  backgroundImage: 'linear-gradient(180deg, #121214 0%, #161618 40%, #18181B 100%)',
};
