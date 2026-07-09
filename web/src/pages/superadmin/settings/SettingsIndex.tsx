import { useMemo, useState } from 'react';
import { Box, InputAdornment, TextField, Typography, alpha } from '@mui/material';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import {
  SETTINGS_GROUPS,
  SETTINGS_SECTIONS,
  type SettingsSectionId,
} from './constants';
import { saas } from '../../../components/superadmin/superAdminTokens';

type Props = {
  onSelect: (id: SettingsSectionId) => void;
  isDirty: (id: SettingsSectionId) => boolean;
};

export default function SettingsIndex({ onSelect, isDirty }: Props) {
  const [query, setQuery] = useState('');
  const sectionMap = Object.fromEntries(SETTINGS_SECTIONS.map((s) => [s.id, s]));

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SETTINGS_GROUPS;
    return SETTINGS_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((id) => {
        const s = sectionMap[id];
        if (!s) return false;
        return (
          s.label.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          group.title.toLowerCase().includes(q)
        );
      }),
    })).filter((g) => g.items.length > 0);
  }, [query, sectionMap]);

  return (
    <Box>
      <TextField
        fullWidth
        size="small"
        placeholder="Search settings…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchOutlinedIcon sx={{ fontSize: 20, color: saas.colors.textMuted }} />
            </InputAdornment>
          ),
        }}
        sx={{
          mb: 2.5,
          maxWidth: 420,
          '& .MuiOutlinedInput-root': {
            borderRadius: `${saas.radius.md}px`,
            bgcolor: '#fff',
          },
        }}
      />

      <Box
        sx={{
          border: `1px solid ${saas.colors.cardBorder}`,
          borderRadius: `${saas.radius.lg}px`,
          bgcolor: '#fff',
          boxShadow: saas.shadow.card,
          overflow: 'hidden',
        }}
      >
        {filteredGroups.length === 0 ? (
          <Box py={6} textAlign="center">
            <Typography color="text.secondary">No settings match your search.</Typography>
          </Box>
        ) : (
          filteredGroups.map((group, gi) => (
            <Box key={group.title}>
              <Box
                sx={{
                  px: 3,
                  py: 1.25,
                  bgcolor: alpha(saas.colors.textMuted, 0.04),
                  borderTop: gi > 0 ? `1px solid ${saas.colors.cardBorder}` : 'none',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: saas.colors.textMuted,
                    fontSize: 11,
                  }}
                >
                  {group.title}
                </Typography>
              </Box>

              {group.items.map((id, ii) => {
                const s = sectionMap[id];
                if (!s) return null;
                const Icon = s.icon;
                const dirty = isDirty(id);
                const last = ii === group.items.length - 1 && gi === filteredGroups.length - 1;

                return (
                  <Box
                    key={id}
                    component="button"
                    type="button"
                    onClick={() => onSelect(id)}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'auto 1fr auto', md: 'auto 1fr 280px auto' },
                      alignItems: 'center',
                      gap: { xs: 1.5, md: 2 },
                      width: '100%',
                      px: 3,
                      py: 2,
                      border: 'none',
                      borderBottom: last ? 'none' : `1px solid ${saas.colors.cardBorder}`,
                      bgcolor: '#fff',
                      cursor: 'pointer',
                      font: 'inherit',
                      textAlign: 'left',
                      transition: 'background-color 0.15s',
                      '&:hover': { bgcolor: alpha(saas.colors.primary, 0.04) },
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: `${saas.radius.sm}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(saas.colors.textMuted, 0.08),
                        color: saas.colors.textMuted,
                      }}
                    >
                      <Icon sx={{ fontSize: 18 }} />
                    </Box>

                    <Box minWidth={0}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography fontWeight={600} fontSize={14} color={saas.colors.textDark}>
                          {s.label}
                        </Typography>
                        {dirty && (
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#FF9800' }} />
                        )}
                      </Box>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: { xs: 'none', md: 'block' },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: 13,
                      }}
                    >
                      {s.description}
                    </Typography>

                    <ChevronRightRoundedIcon sx={{ fontSize: 20, color: saas.colors.textMuted }} />
                  </Box>
                );
              })}
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
