import React, { useCallback, useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import {
  Create,
  Image as ImageIcon,
  Key,
  Logout,
} from '@mui/icons-material';
import { api } from '../../services/api';

const sanitizeWebImageSrc = (src: unknown): string | null => {
  if (!src || typeof src !== 'string') return null;
  const trimmed = src.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('file:') || lower.includes('var/mobile') || lower.includes('imagepicker')) return null;
  return trimmed;
};

type StaffProfileMenuProps = {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  mode?: 'admin' | 'manager';
};

const StaffProfileMenu: React.FC<StaffProfileMenuProps> = ({
  anchorEl,
  open,
  onClose,
  onLogout,
  mode = 'admin',
}) => {
  const [displayName, setDisplayName] = useState('User');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [roleLabel, setRoleLabel] = useState('Administrator');

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageInput, setImageInput] = useState('');

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const syncFromStorage = useCallback(() => {
    const raw = localStorage.getItem('userData');
    const role = String(localStorage.getItem('userRole') || '').toUpperCase();
    let name = mode === 'manager' ? 'Manager' : 'Admin';
    let mail = '';
    let image: string | null = null;

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        name = String(parsed?.name || parsed?.displayName || name);
        mail = String(parsed?.email || '');
        const src = sanitizeWebImageSrc(parsed?.profileImage || parsed?.avatar || parsed?.image);
        image = src ? api.getImageUrl(src) : null;
      } catch {
        /* ignore */
      }
    }

    setDisplayName(name);
    setEmail(mail);
    setProfileImage(image);
    setRoleLabel(
      role === 'BRANCH_MANAGER' || mode === 'manager'
        ? 'Manager'
        : role === 'SUPER_ADMIN'
          ? 'Super Admin'
          : 'Administrator'
    );
  }, [mode]);

  useEffect(() => {
    if (!open) return;
    syncFromStorage();
  }, [open, syncFromStorage]);

  const patchStoredUser = (patch: Record<string, unknown>) => {
    const raw = localStorage.getItem('userData');
    const current = raw ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : {};
    const next = { ...current, ...patch };
    localStorage.setItem('userData', JSON.stringify(next));
    window.dispatchEvent(new Event('profileUpdated'));
    window.dispatchEvent(new Event('userDataUpdated'));
    syncFromStorage();
  };

  const openNameDialog = () => {
    onClose();
    setProfileError('');
    setNameInput(displayName);
    setNameDialogOpen(true);
  };

  const openImageDialog = () => {
    onClose();
    setProfileError('');
    setImageInput('');
    setImageDialogOpen(true);
  };

  const openPasswordDialog = () => {
    onClose();
    setProfileError('');
    setCurrentPassword('');
    setNewPassword('');
    setPasswordDialogOpen(true);
  };

  const saveName = async () => {
    const nextName = nameInput.trim();
    if (!nextName) return;
    setProfileSaving(true);
    setProfileError('');
    try {
      const res = await api.patch('/users/profile', { name: nextName });
      if (!res?.success) {
        setProfileError(String(res?.error || res?.message || 'Failed to update name'));
        return;
      }
      setNameDialogOpen(false);
      patchStoredUser({ name: nextName, displayName: nextName });
    } finally {
      setProfileSaving(false);
    }
  };

  const uploadImageFile = async (file: File) => {
    setProfileSaving(true);
    setProfileError('');
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      const res = await api.uploadImage(base64Data, file.name);
      const uploadData = res?.data as { url?: string; imageUrl?: string } | undefined;
      const url = String(uploadData?.url || uploadData?.imageUrl || '');
      if (!res?.success || !url) {
        setProfileError(String(res?.error || res?.message || 'Failed to upload image'));
        return;
      }
      setImageInput(url);
    } catch (e: unknown) {
      setProfileError(String((e as Error)?.message || 'Failed to upload image'));
    } finally {
      setProfileSaving(false);
    }
  };

  const saveImage = async () => {
    const raw = imageInput.trim();
    const nextUrl = raw ? api.getImageUrl(raw) : '';
    if (!nextUrl) return;
    setProfileSaving(true);
    setProfileError('');
    try {
      const res = await api.patch('/users/profile', {
        avatar: nextUrl,
        image: nextUrl,
        profileImage: nextUrl,
      });
      if (!res?.success) {
        setProfileError(String(res?.error || res?.message || 'Failed to update image'));
        return;
      }
      setImageDialogOpen(false);
      patchStoredUser({ avatar: nextUrl, image: nextUrl, profileImage: nextUrl });
    } finally {
      setProfileSaving(false);
    }
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword) return;
    setProfileSaving(true);
    setProfileError('');
    try {
      const res = await api.put('/users/change-password', {
        currentPassword,
        newPassword,
      });
      if (!res?.success) {
        setProfileError(String(res?.error || res?.message || 'Failed to change password'));
        return;
      }
      setPasswordDialogOpen(false);
      setCurrentPassword('');
      setNewPassword('');
    } finally {
      setProfileSaving(false);
    }
  };

  const confirmLogout = () => {
    onClose();
    if (!window.confirm('Are you sure you want to logout?')) return;
    onLogout();
  };

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 260,
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5 }}>
          <Avatar
            src={profileImage || undefined}
            sx={{ width: 48, height: 48, bgcolor: '#FF6B35', fontWeight: 700 }}
          >
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 16, color: '#1a1a2e' }}>
              {displayName}
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#666' }}>{roleLabel}</Typography>
            {email ? (
              <Typography sx={{ fontSize: 12, color: '#999', mt: 0.25 }} noWrap>
                {email}
              </Typography>
            ) : null}
          </Box>
        </Box>
        <Divider />
        <MenuItem onClick={openImageDialog} sx={{ py: 1.25 }}>
          <ListItemIcon sx={{ color: '#E87E35', minWidth: 36 }}>
            <ImageIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Change image" primaryTypographyProps={{ fontSize: 15 }} />
        </MenuItem>
        <MenuItem onClick={openNameDialog} sx={{ py: 1.25 }}>
          <ListItemIcon sx={{ color: '#E87E35', minWidth: 36 }}>
            <Create fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Change name" primaryTypographyProps={{ fontSize: 15 }} />
        </MenuItem>
        <MenuItem onClick={openPasswordDialog} sx={{ py: 1.25 }}>
          <ListItemIcon sx={{ color: '#E87E35', minWidth: 36 }}>
            <Key fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Change password" primaryTypographyProps={{ fontSize: 15 }} />
        </MenuItem>
        <Divider />
        <MenuItem onClick={confirmLogout} sx={{ py: 1.25 }}>
          <ListItemIcon sx={{ color: '#E87E35', minWidth: 36 }}>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: 15 }} />
        </MenuItem>
      </Menu>

      <Dialog open={nameDialogOpen} onClose={() => setNameDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Change name</DialogTitle>
        <DialogContent dividers>
          {profileError ? (
            <Typography color="error" sx={{ mb: 1, fontSize: 13 }}>
              {profileError}
            </Typography>
          ) : null}
          <TextField
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            fullWidth
            label="Name"
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNameDialogOpen(false)} disabled={profileSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void saveName()}
            disabled={profileSaving || !nameInput.trim()}
            sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#e55a2b' } }}
          >
            {profileSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={imageDialogOpen} onClose={() => setImageDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Change image</DialogTitle>
        <DialogContent dividers>
          {profileError ? (
            <Typography color="error" sx={{ mb: 1, fontSize: 13 }}>
              {profileError}
            </Typography>
          ) : null}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar
              src={
                imageInput.trim()
                  ? api.getImageUrl(imageInput.trim())
                  : profileImage || undefined
              }
              sx={{ width: 56, height: 56, bgcolor: '#FF6B35' }}
            >
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Button variant="outlined" component="label" disabled={profileSaving}>
              Upload image
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadImageFile(file);
                  e.target.value = '';
                }}
              />
            </Button>
          </Box>
          <TextField
            value={imageInput}
            onChange={(e) => setImageInput(e.target.value)}
            fullWidth
            label="Image URL (optional)"
            placeholder="https://..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageDialogOpen(false)} disabled={profileSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void saveImage()}
            disabled={profileSaving || !imageInput.trim()}
            sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#e55a2b' } }}
          >
            {profileSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Change password</DialogTitle>
        <DialogContent dividers>
          {profileError ? (
            <Typography color="error" sx={{ mb: 1, fontSize: 13 }}>
              {profileError}
            </Typography>
          ) : null}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              type="password"
              label="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              fullWidth
            />
            <TextField
              type="password"
              label="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)} disabled={profileSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void savePassword()}
            disabled={profileSaving || !currentPassword || !newPassword}
            sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#e55a2b' } }}
          >
            {profileSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default StaffProfileMenu;
