import { Box, TextField } from '@mui/material';
import { saasTextFieldSx } from '../../../../components/superadmin/superAdminFormStyles';
import { saas } from '../../../../components/superadmin/superAdminTokens';

export default function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Box display="flex" gap={1.5} alignItems="center">
      <Box
        component="input"
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        sx={{ width: 40, height: 40, border: 'none', borderRadius: 1, cursor: 'pointer', p: 0 }}
      />
      <TextField
        size="small"
        label={label}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        sx={{ ...saasTextFieldSx, flex: 1 }}
      />
      <Box
        sx={{
          px: 1.5,
          py: 0.75,
          borderRadius: 1,
          bgcolor: value || saas.colors.primary,
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        Preview
      </Box>
    </Box>
  );
}
