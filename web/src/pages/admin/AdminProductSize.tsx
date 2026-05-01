import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Skeleton,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Add, Edit, Delete } from '@mui/icons-material';
import { api } from '../../services/api';

interface ProductSize {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

const AdminProductSize: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<ProductSize | null>(null);
  const [formData, setFormData] = useState({ size_name: '', description: '' });

  useEffect(() => {
    loadSizes();
  }, []);

  const loadSizes = async () => {
    try {
      setLoading(true);
      const response: any = await api.getProductSizes();
      console.log('[ProductSize] API response:', response);
      if (response.success && response.data) {
        const rawSizes = response.data.sizes || response.data || [];
        console.log('[ProductSize] Raw sizes:', rawSizes);
        const normalized = rawSizes.map((s: any) => ({
          _id: s._id || s.id,
          name: s.size_name || s.name || '',
          description: s.description || '',
          isActive: s.is_active !== false && s.isActive !== false,
          createdAt: s.createdAt || s.created_at || new Date().toISOString(),
        }));
        console.log('[ProductSize] Normalized sizes:', normalized);
        setSizes(normalized);
      }
    } catch (error) {
      console.error('Error loading product sizes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (size?: ProductSize) => {
    if (size) {
      setEditingSize(size);
      setFormData({ size_name: size.name, description: size.description || '' });
    } else {
      setEditingSize(null);
      setFormData({ size_name: '', description: '' });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSize(null);
    setFormData({ size_name: '', description: '' });
  };

  const handleSave = async () => {
    try {
      if (editingSize) {
        await api.updateProductSize(editingSize._id, formData);
      } else {
        await api.createProductSize(formData);
      }
      handleCloseDialog();
      loadSizes();
    } catch (error) {
      console.error('Error saving product size:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this size?')) {
      try {
        await api.deleteProductSize(id);
        loadSizes();
      } catch (error) {
        console.error('Error deleting product size:', error);
      }
    }
  };

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', pb: 3, pt: 0 }}>
      <Container maxWidth="xl">
        <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                Product Sizes
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
                sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#e55a2b' } }}
              >
                Add Size
              </Button>
            </Box>

            {loading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <TableContainer sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <Table size={isMobile ? 'small' : 'medium'} sx={{ minWidth: 640 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sizes.map((size) => (
                      <TableRow key={size._id} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{size.name}</TableCell>
                        <TableCell>{size.description || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={size.isActive ? 'Active' : 'Inactive'}
                            color={size.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => handleOpenDialog(size)}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDelete(size._id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {sizes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4, color: '#666' }}>
                          No product sizes found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{editingSize ? 'Edit Size' : 'Add Size'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Size Name"
              value={formData.size_name}
              onChange={(e) => setFormData({ ...formData, size_name: e.target.value })}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              sx={{ mt: 2 }}
              multiline
              rows={2}
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

export default AdminProductSize;
