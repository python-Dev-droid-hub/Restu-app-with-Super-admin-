import { Box, Button, Grid, TextField, Typography, Paper } from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';

export interface TenantBrandingFormValues {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  name?: string;
  slug?: string;
}

interface TenantBrandingFieldsProps {
  values: TenantBrandingFormValues;
  onChange: (field: keyof TenantBrandingFormValues, value: string) => void;
  onUpload: (file: File, field: 'logoUrl' | 'faviconUrl') => void;
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Box>
      <Typography variant="body2" fontWeight={600} mb={1}>
        {label}
      </Typography>
      <Box display="flex" gap={1.5} alignItems="center">
        <Box
          component="input"
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          sx={{
            width: 52,
            height: 52,
            p: 0,
            border: '2px solid',
            borderColor: 'divider',
            borderRadius: 2,
            cursor: 'pointer',
            bgcolor: 'transparent',
          }}
        />
        <TextField
          fullWidth
          size="small"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputProps={{ maxLength: 7 }}
        />
      </Box>
    </Box>
  );
}

function UploadField({
  label,
  hint,
  previewUrl,
  onSelect,
}: {
  label: string;
  hint: string;
  previewUrl?: string;
  onSelect: (file: File) => void;
}) {
  return (
    <Box>
      <Typography variant="body2" fontWeight={600} mb={1}>
        {label}
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderStyle: 'dashed',
          borderRadius: 2,
          textAlign: 'center',
          bgcolor: 'grey.50',
        }}
      >
        {previewUrl ? (
          <Box component="img" src={previewUrl} alt={label} sx={{ maxHeight: 56, mb: 1 }} />
        ) : (
          <CloudUploadOutlinedIcon sx={{ fontSize: 32, color: 'text.secondary', mb: 0.5 }} />
        )}
        <Typography variant="caption" display="block" color="text.secondary" mb={1}>
          {hint}
        </Typography>
        <Button component="label" variant="outlined" size="small">
          Choose file
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && onSelect(e.target.files[0])}
          />
        </Button>
      </Paper>
    </Box>
  );
}

export function TenantBrandingFields({ values, onChange, onUpload }: TenantBrandingFieldsProps) {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <UploadField
          label="Logo"
          hint="PNG or JPG, shown in app header"
          previewUrl={values.logoUrl}
          onSelect={(f) => onUpload(f, 'logoUrl')}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <UploadField
          label="Favicon"
          hint="Square icon for browser tab"
          previewUrl={values.faviconUrl}
          onSelect={(f) => onUpload(f, 'faviconUrl')}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <ColorField
          label="Primary Color"
          value={values.primaryColor}
          onChange={(v) => onChange('primaryColor', v)}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <ColorField
          label="Secondary Color"
          value={values.secondaryColor}
          onChange={(v) => onChange('secondaryColor', v)}
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Paper sx={{ overflow: 'hidden', borderRadius: 2 }}>
          <Box sx={{ bgcolor: values.primaryColor, px: 3, py: 2 }}>
            <Typography fontWeight={700} color="#fff">
              {values.name || 'Restaurant Preview'}
            </Typography>
            {values.slug && (
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                {values.slug}.yourapp.com
              </Typography>
            )}
          </Box>
          <Box sx={{ bgcolor: values.secondaryColor, px: 3, py: 1.5 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              Buttons, links, and accents use your primary color across the tenant app.
            </Typography>
          </Box>
          <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
            <Button variant="contained" sx={{ bgcolor: values.primaryColor, '&:hover': { filter: 'brightness(0.92)' } }}>
              Primary action
            </Button>
            <Button variant="outlined" sx={{ borderColor: values.secondaryColor, color: values.secondaryColor }}>
              Secondary
            </Button>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
}
