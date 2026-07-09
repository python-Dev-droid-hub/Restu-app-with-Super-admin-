import { useState } from 'react';
import { IconButton, InputAdornment, TextField, type TextFieldProps } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { saasTextFieldSx } from '../../../../components/superadmin/superAdminFormStyles';
import { SECRET_MASK } from '../constants';

export default function SecretField({
  value,
  onChange,
  configured,
  ...props
}: TextFieldProps & { configured?: boolean; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  const display = value === SECRET_MASK ? SECRET_MASK : value;

  return (
    <TextField
      {...props}
      fullWidth
      size="small"
      type={show ? 'text' : 'password'}
      value={display}
      placeholder={configured ? SECRET_MASK : props.placeholder}
      onChange={(e) => onChange(e.target.value)}
      sx={{ ...saasTextFieldSx, ...props.sx }}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => setShow((s) => !s)} edge="end">
              {show ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}
