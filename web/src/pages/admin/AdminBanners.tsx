import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Skeleton,
} from '@mui/material';
import { Add, Edit, Delete, Image as ImageIcon } from '@mui/icons-material';
import { api } from '../../services/api';

interface Banner {
  _id: string;
  title: string;
  imageUrl: string;
  link?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
}

const AdminBanners: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    imageUrl: '',
    isActive: true,
    order: 0,
  });

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const response: any = await api.getBanners();
      if (response.success && response.data) {
        const rawBanners = response.data.banners || response.data || [];
        const normalized = rawBanners.map((b: any) => {
          let imageUrl = b.imageUrl || b.image || '';
          // Filter out invalid paths (mobile app paths, file:// URLs)
          if (imageUrl && (imageUrl.startsWith('file://') || imageUrl.includes('var/mobile') || imageUrl.includes('ImagePicker'))) {
            imageUrl = '';
          }
          return {
            _id: b._id || b.id,
            title: b.title || 'Untitled',
            imageUrl,
            link: b.link || '',
            isActive: b.isActive ?? true,
            order: b.order || 0,
          };
        });
        setBanners(normalized);
      }
    } catch (error) {
      console.error('Error loading banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        imageUrl: banner.imageUrl,
        isActive: banner.isActive,
        order: banner.order,
      });
    } else {
      setEditingBanner(null);
      setFormData({ imageUrl: '', isActive: true, order: 0 });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingBanner(null);
  };

  const handleSave = async () => {
    try {
      const payload: any = {
        ...formData,
        title: editingBanner?.title || 'Banner',
        link: editingBanner?.link || '',
      };
      if (editingBanner) {
        await api.updateBanner(editingBanner._id, payload);
      } else {
        await api.createBanner(payload);
      }
      handleCloseDialog();
      loadBanners();
    } catch (error) {
      console.error('Error saving banner:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this banner?')) {
      try {
        await api.deleteBanner(id);
        loadBanners();
      } catch (error) {
        console.error('Error deleting banner:', error);
      }
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      await api.updateBanner(banner._id, { isActive: !banner.isActive });
      loadBanners();
    } catch (error) {
      console.error('Error updating banner:', error);
    }
  };

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', py: 3 }}>
      <Container maxWidth="xl">
        <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                Banner Management
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
                sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#e55a2b' } }}
              >
                Add Banner
              </Button>
            </Box>

            {loading ? (
              <Grid container spacing={2}>
                {[1, 2, 3, 4].map((i) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                    <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Grid container spacing={2}>
                {banners.map((banner) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={banner._id}>
                    <Paper
                      elevation={2}
                      sx={{
                        borderRadius: 2,
                        overflow: 'hidden',
                        opacity: banner.isActive ? 1 : 0.6,
                      }}
                    >
                      <Box
                        sx={{
                          height: 150,
                          bgcolor: '#f0f0f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundImage: banner.imageUrl ? `url(${api.getImageUrl(banner.imageUrl)})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      >
                        {!banner.imageUrl && <ImageIcon sx={{ fontSize: 50, color: '#ccc' }} />}
                      </Box>
                      <Box sx={{ p: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {banner.title}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={banner.isActive}
                                onChange={() => handleToggleActive(banner)}
                                size="small"
                              />
                            }
                            label={<Typography variant="caption">Active</Typography>}
                          />
                          <Box>
                            <IconButton size="small" onClick={() => handleOpenDialog(banner)}>
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDelete(banner._id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
                {banners.length === 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Typography align="center" sx={{ py: 4, color: '#666' }}>
                      No banners found. Add your first banner!
                    </Typography>
                  </Grid>
                )}
              </Grid>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{editingBanner ? 'Edit Banner' : 'Add Banner'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Image URL"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              sx={{ mt: 2 }}
              placeholder="https://example.com/image.jpg"
            />
            <TextField
              fullWidth
              label="Display Order"
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
              sx={{ mt: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Active"
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSave} variant="contained" sx={{ bgcolor: '#FF6B35' }}>
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default AdminBanners;
