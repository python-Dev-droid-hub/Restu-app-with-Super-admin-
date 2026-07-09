import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Skeleton,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Category,
} from '@mui/icons-material';
import { io, type Socket } from 'socket.io-client';
import { api } from '../../services/api';
import { getSocketIoOptions, getSocketIoUrl } from '../../utils/socketOptions';
import { BACKEND_UNREACHABLE_MSG } from '../../utils/backendHealth';
import { useAdminPageStyles } from '../../utils/adminResponsive';

interface CategoryItem {
  _id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
  itemCount?: number;
  branchId?: string[];
}

const AdminCategories: React.FC = () => {
  const { page, header, primaryBtn, titleSx, theme } = useAdminPageStyles();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    displayOrder: 0,
    isActive: true,
    branchId: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const normalizeCategories = (rawCategories: unknown[]) =>
    rawCategories.map((c: any) => {
      let imageUrl = c.imageUrl || c.image || '';
      if (
        imageUrl &&
        (imageUrl.startsWith('file://') ||
          imageUrl.includes('var/mobile') ||
          imageUrl.includes('ImagePicker'))
      ) {
        imageUrl = '';
      }
      return {
        _id: c._id || c.id,
        name: c.name || 'Unnamed',
        description: c.description || '',
        imageUrl,
        displayOrder: c.displayOrder || 0,
        isActive: c.isActive ?? true,
        itemCount: c.productCount || c.itemCount || 0,
        branchId: Array.isArray(c.branchId) ? c.branchId : c.branchId ? [c.branchId] : [],
      };
    });

  const loadViaHttp = async () => {
    try {
      const [catRes, branchRes]: any[] = await Promise.all([
        api.getAllCategories(),
        api.getAllBranches(),
      ]);
      if (branchRes?.success) {
        const list =
          branchRes?.data?.branches || branchRes?.data?.data?.branches || branchRes?.data || [];
        setBranches(Array.isArray(list) ? list : []);
      }
      if (catRes?.success) {
        const raw =
          catRes?.data?.categories || catRes?.data?.data?.categories || catRes?.data || [];
        setCategories(normalizeCategories(Array.isArray(raw) ? raw : []));
        setError('');
      } else {
        setError(catRes?.error || BACKEND_UNREACHABLE_MSG);
      }
    } catch {
      setError(BACKEND_UNREACHABLE_MSG);
    }
    setLoading(false);
  };

  useEffect(() => {
    const socket = io(getSocketIoUrl(), getSocketIoOptions());
    socketRef.current = socket;

    const request = () => {
      setLoading(true);
      socket.emit('admin_categories:get');
      socket.emit('admin_branches:get');
    };

    socket.on('connect', request);
    socket.on('admin_branches:data', (payload: any) => {
      const list = payload?.branches || payload?.data?.branches || payload?.data || payload || [];
      setBranches(Array.isArray(list) ? list : []);
    });

    socket.on('admin_categories:data', (payload: any) => {
      const rawCategories =
        payload?.categories || payload?.data?.categories || payload?.data || payload || [];
      setCategories(normalizeCategories(Array.isArray(rawCategories) ? rawCategories : []));
      setLoading(false);
      setError('');
    });

    socket.on('connect_error', () => {
      void loadViaHttp();
    });

    setLoading(true);
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    if (socket.connected) {
      request();
    } else {
      fallbackTimer = setTimeout(() => {
        if (!socket.connected) void loadViaHttp();
      }, 4000);
    }

    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const refreshData = () => {
    socketRef.current?.emit('admin_categories:get');
    socketRef.current?.emit('admin_branches:get');
  };

  const handleOpenDialog = (category?: CategoryItem) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        imageUrl: category.imageUrl || '',
        displayOrder: category.displayOrder || 0,
        isActive: category.isActive ?? true,
        branchId: category.branchId || [],
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '', imageUrl: '', displayOrder: 0, isActive: true, branchId: [] as string[] });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setError('');
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      console.log('🔍 [DEBUG] Saving category with data:', formData);
      
      let response: any;
      if (editingCategory) {
        response = await api.updateCategory(editingCategory._id, formData);
      } else {
        response = await api.createCategory(formData);
      }

      console.log('🔍 [DEBUG] Save response:', response);

      if (response?.success) {
        handleCloseDialog();
        refreshData();
      } else {
        const errorMsg = response?.message || response?.error?.message || 'Failed to save category';
        console.error('🔍 [DEBUG] Save failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error('🔍 [DEBUG] Save error:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to save category';
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      const response: any = await api.deleteCategory(id);
      if (response?.success) {
        refreshData();
      }
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  return (
    <Box sx={{ ...page, bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
      <Box sx={header}>
        <Typography variant="h5" sx={titleSx}>
          Categories
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{ ...primaryBtn, borderRadius: 2 }}
        >
          Add Category
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ borderRadius: 2 }}>
                <Skeleton variant="rectangular" height={140} />
                <CardContent>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" />
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : categories.length === 0 ? (
          <Grid size={12}>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Category sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
              <Typography color="#999">No categories found</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
                sx={{ mt: 2, ...primaryBtn, borderRadius: 2 }}
              >
                Create First Category
              </Button>
            </Box>
          </Grid>
        ) : (
          categories.map((category) => (
            <Grid key={category._id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                sx={{
                  borderRadius: 2,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  },
                }}
              >
                <CardMedia
                  component="img"
                  height="140"
                  image={category.imageUrl ? api.getImageUrl(category.imageUrl) : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='}
                  alt={category.name}
                  sx={{ objectFit: 'cover', bgcolor: '#f5f5f5' }}
                />
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {category.name}
                    </Typography>
                    <Chip
                      label={category.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        bgcolor: category.isActive ? '#E8F5E9' : '#FFEBEE',
                        color: category.isActive ? '#4CAF50' : '#F44336',
                        fontSize: 11,
                      }}
                    />
                  </Box>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    {category.description || 'No description'}
                  </Typography>
                  <Typography variant="caption" color="#999">
                    {category.itemCount || 0} items
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <IconButton size="small" onClick={() => handleOpenDialog(category)}>
                      <Edit sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(category._id)}>
                      <Delete sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <Box sx={{ mt: 2, mb: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Category Image</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {formData.imageUrl && (
                <Box
                  component="img"
                  src={api.getImageUrl(formData.imageUrl)}
                  sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1 }}
                />
              )}
              <Button variant="outlined" component="label" size="small">
                Upload Image
                <input type="file" hidden accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const reader = new FileReader();
                    reader.onload = async () => {
                      const base64 = reader.result as string;
                      const response: any = await api.uploadImage(base64, file.name);
                      if (response?.success && response?.data?.url) {
                        setFormData({ ...formData, imageUrl: response.data.url });
                      }
                    };
                    reader.readAsDataURL(file);
                  } catch (error) {
                    console.error('Error uploading image:', error);
                  }
                }} />
              </Button>
            </Box>
          </Box>
          <TextField
            margin="dense"
            label="Display Order"
            type="number"
            fullWidth
            value={formData.displayOrder}
            onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
          />
          <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
            <InputLabel id="branch-select-label">Branches</InputLabel>
            <Select
              labelId="branch-select-label"
              multiple
              value={formData.branchId || []}
              label="Branches"
              onChange={(e) => setFormData({ ...formData, branchId: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((id) => {
                    const name = branches.find((b) => b._id === id)?.branchName || id;
                    return <Chip key={id} label={name} size="small" />;
                  })}
                </Box>
              )}
            >
              {branches.map((branch) => (
                <MenuItem key={branch._id} value={branch._id}>
                  {branch.branchName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminCategories;
