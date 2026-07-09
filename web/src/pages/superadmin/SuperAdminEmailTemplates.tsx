import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Chip, List, ListItemButton, ListItemText,
  TextField, Typography, FormControlLabel, Switch,
} from '@mui/material';
import { SuperAdminLayout } from '../../components/superadmin/SuperAdminLayout';
import { superAdminApi } from '../../services/superAdminApi';

const VARS = [
  '{{restaurant_name}}', '{{owner_name}}', '{{owner_email}}', '{{plan_name}}',
  '{{trial_end_date}}', '{{login_url}}', '{{support_email}}', '{{temp_password}}',
  '{{slug}}', '{{amount}}', '{{days_remaining}}', '{{reason}}',
];

export default function SuperAdminEmailTemplates() {
  const { key } = useParams();
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const [saved, setSaved] = useState(false);

  const loadList = () => {
    superAdminApi.get('/settings/email-templates').then((r: any) => setTemplates(r.data?.templates || []));
  };

  const loadTemplate = (k: string) => {
    superAdminApi.get(`/settings/email-templates/${k}`).then((r: any) => setSelected(r.data?.template));
  };

  useEffect(() => { loadList(); }, []);
  useEffect(() => {
    if (key) loadTemplate(key);
    else if (templates.length) loadTemplate(templates[0].key);
  }, [key, templates.length]);

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
    <SuperAdminLayout>
      <Typography variant="h5" fontWeight={700} mb={3}>Email Templates</Typography>
      <Box display="flex" gap={2}>
        <Card sx={{ width: 260, flexShrink: 0 }}>
          <List dense>
            {templates.map((t) => (
              <ListItemButton key={t.key} selected={selected?.key === t.key} onClick={() => loadTemplate(t.key)}>
                <ListItemText primary={t.name} secondary={t.key} />
                {!t.isActive && <Chip size="small" label="Off" />}
              </ListItemButton>
            ))}
          </List>
        </Card>
        {selected && (
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" mb={1}>{selected.name}</Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
                {VARS.map((v) => <Chip key={v} size="small" label={v} variant="outlined" />)}
              </Box>
              <TextField fullWidth label="Subject" sx={{ mb: 2 }} value={selected.subject}
                onChange={(e) => setSelected({ ...selected, subject: e.target.value })} />
              <TextField fullWidth multiline rows={12} label="Body" sx={{ mb: 2 }} value={selected.body}
                onChange={(e) => setSelected({ ...selected, body: e.target.value })} />
              <FormControlLabel
                control={<Switch checked={selected.isActive !== false}
                  onChange={(e) => setSelected({ ...selected, isActive: e.target.checked })} />}
                label="Active"
              />
              <Box display="flex" gap={1} mt={2}>
                <Button variant="contained" color="primary" onClick={save}>{saved ? 'Saved!' : 'Save'}</Button>
                <Button variant="outlined" onClick={doPreview}>Preview</Button>
              </Box>
              {preview && (
                <Box mt={2} p={2} bgcolor="#f5f5f5" borderRadius={1}>
                  <Typography fontWeight={600}>{preview.subject}</Typography>
                  <Typography sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{preview.body}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </SuperAdminLayout>
  );
}
