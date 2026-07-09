import { useEffect, useState } from 'react';
import {
  Box, Button, Chip, List, ListItemButton, ListItemText, TextField,
  Typography, FormControlLabel, Switch, alpha,
} from '@mui/material';
import { superAdminApi } from '../../../../services/superAdminApi';
import { saasTextFieldSx } from '../../../../components/superadmin/superAdminFormStyles';
import { saas } from '../../../../components/superadmin/superAdminTokens';

const VARS = [
  '{{platform_name}}', '{{restaurant_name}}', '{{owner_name}}', '{{owner_email}}', '{{plan_name}}',
  '{{trial_end_date}}', '{{login_url}}', '{{support_email}}', '{{temp_password}}',
  '{{slug}}', '{{amount}}', '{{days_remaining}}', '{{reason}}',
];

const LIST_WIDTH = 280;

export default function TemplatesSection() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const [saved, setSaved] = useState(false);

  const loadList = () => {
    superAdminApi.get('/settings/email-templates').then((r: any) => setTemplates(r.data?.templates || []));
  };

  useEffect(() => { loadList(); }, []);
  useEffect(() => {
    if (templates.length && !selected) {
      superAdminApi.get(`/settings/email-templates/${templates[0].key}`).then((r: any) => setSelected(r.data?.template));
    }
  }, [templates, selected]);

  const loadTemplate = (k: string) => {
    superAdminApi.get(`/settings/email-templates/${k}`).then((r: any) => setSelected(r.data?.template));
    setPreview(null);
  };

  const insertVar = (v: string) => {
    if (!selected) return;
    setSelected({ ...selected, body: `${selected.body || ''}${v}` });
  };

  const save = async () => {
    if (!selected) return;
    await superAdminApi.patch(`/settings/email-templates/${selected.key}`, {
      subject: selected.subject,
      body: selected.body,
      isActive: selected.isActive,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    loadList();
  };

  const doPreview = async () => {
    if (!selected) return;
    const r: any = await superAdminApi.post(`/settings/email-templates/${selected.key}/preview`);
    setPreview(r.data);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'stretch',
        width: '100%',
        gap: 2,
        minHeight: 480,
      }}
    >
      {/* Template list — fixed width, always adjacent to editor */}
      <Box
        sx={{
          width: { xs: '100%', md: LIST_WIDTH },
          flexShrink: 0,
          border: `1px solid ${saas.colors.cardBorder}`,
          borderRadius: `${saas.radius.lg}px`,
          overflow: 'hidden',
          bgcolor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: { md: 'calc(100vh - 340px)' },
        }}
      >
        <Box px={2} py={1.75} bgcolor={alpha(saas.colors.textMuted, 0.04)} borderBottom={`1px solid ${saas.colors.cardBorder}`}>
          <Typography variant="subtitle2" fontWeight={800} fontSize={14}>Templates</Typography>
          <Typography variant="caption" color="text.secondary">{templates.length} emails</Typography>
        </Box>
        <List disablePadding sx={{ overflowY: 'auto', flex: 1 }}>
          {templates.map((t) => (
            <ListItemButton
              key={t.key}
              selected={selected?.key === t.key}
              onClick={() => loadTemplate(t.key)}
              sx={{
                py: 1.25,
                px: 2,
                borderBottom: `1px solid ${saas.colors.cardBorder}`,
                '&.Mui-selected': {
                  bgcolor: alpha(saas.colors.primary, 0.08),
                  borderLeft: `3px solid ${saas.colors.primary}`,
                },
              }}
            >
              <ListItemText
                primary={t.name}
                secondary={t.key.replace(/_/g, ' ')}
                primaryTypographyProps={{ fontSize: 13, fontWeight: 700 }}
                secondaryTypographyProps={{ fontSize: 11 }}
              />
              {!t.isActive && <Chip size="small" label="Off" variant="outlined" sx={{ height: 20, fontSize: 10 }} />}
            </ListItemButton>
          ))}
        </List>
      </Box>

      {/* Editor — grows to fill all remaining space */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          width: '100%',
          border: `1px solid ${saas.colors.cardBorder}`,
          borderRadius: `${saas.radius.lg}px`,
          p: { xs: 2, md: 2.5 },
          bgcolor: '#fff',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {selected ? (
          <>
            <Typography variant="subtitle1" fontWeight={800} mb={0.25}>{selected.name}</Typography>
            <Typography variant="caption" color="text.secondary" mb={2}>
              Click a variable chip to insert into the body
            </Typography>

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.75,
                mb: 2,
                p: 1.5,
                borderRadius: `${saas.radius.md}px`,
                bgcolor: alpha(saas.colors.textMuted, 0.04),
                border: `1px dashed ${saas.colors.cardBorder}`,
              }}
            >
              {VARS.map((v) => (
                <Chip key={v} size="small" label={v} variant="outlined" clickable onClick={() => insertVar(v)} sx={{ fontSize: 11 }} />
              ))}
            </Box>

            <TextField
              fullWidth
              size="small"
              label="Subject"
              sx={{ ...saasTextFieldSx, mb: 2 }}
              value={selected.subject}
              onChange={(e) => setSelected({ ...selected, subject: e.target.value })}
            />
            <TextField
              fullWidth
              multiline
              minRows={12}
              label="Body"
              sx={{ ...saasTextFieldSx, mb: 2, flex: 1 }}
              value={selected.body}
              onChange={(e) => setSelected({ ...selected, body: e.target.value })}
            />

            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5} mt={1}>
              <FormControlLabel
                control={<Switch checked={selected.isActive !== false} onChange={(e) => setSelected({ ...selected, isActive: e.target.checked })} />}
                label="Template active"
              />
              <Box display="flex" gap={1}>
                <Button variant="outlined" onClick={() => void doPreview()}>Preview</Button>
                <Button variant="contained" onClick={() => void save()}>{saved ? 'Saved!' : 'Save template'}</Button>
              </Box>
            </Box>

            {preview && (
              <Box mt={2} p={2} bgcolor={alpha(saas.colors.textMuted, 0.04)} borderRadius={2} border={`1px solid ${saas.colors.cardBorder}`}>
                <Typography fontWeight={700} mb={1}>{preview.subject}</Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, fontSize: 14 }}>{preview.body}</Typography>
              </Box>
            )}
          </>
        ) : (
          <Box flex={1} display="flex" alignItems="center" justifyContent="center" color="text.secondary">
            Select a template
          </Box>
        )}
      </Box>
    </Box>
  );
}
