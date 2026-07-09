import { Box, Button, CircularProgress } from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useSettings } from '../SettingsContext';

export default function SectionFooter({ saveKey }: { saveKey: string }) {
  const { isDirty, discardSection, saveSection, saving } = useSettings();
  const dirty = isDirty(saveKey);
  const busy = saving === saveKey;

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 1.25,
        pt: 3,
        mt: 2,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Button variant="outlined" disabled={!dirty || busy} onClick={() => discardSection(saveKey)}>
        Cancel
      </Button>
      <Button
        variant="contained"
        color="primary"
        disabled={!dirty || busy}
        startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
        onClick={() => void saveSection(saveKey)}
      >
        Save section
      </Button>
    </Box>
  );
}
