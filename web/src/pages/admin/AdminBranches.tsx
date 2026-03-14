import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
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
  Divider,
  MenuItem
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Store,
  LocationOn,
  Phone,
  Email,
} from '@mui/icons-material';
import { api } from '../../services/api';

interface BranchItem {
  _id: string;
  branchCode: string;
  branchName: string;
  addressLine: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phoneNumber?: string;
  email?: string;
  isActive?: boolean;
  acceptsDelivery?: boolean;
  acceptsDineIn?: boolean;
  acceptsTakeaway?: boolean;
  currency?: string;
  deliveryRadius?: number;
}

const AdminBranches: React.FC = () => {
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);
  const [formData, setFormData] = useState({
    branchCode: '',
    branchName: '',
    addressLine: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Pakistan',
    phoneNumber: '',
    email: '',
    isActive: true,
    acceptsDelivery: true,
    acceptsDineIn: true,
    acceptsTakeaway: true,
    currency: 'PKR',
    deliveryRadius: 5000,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const response: any = await api.getAllBranches();
      if (response?.success) {
        const rawBranches = response.data?.branches || response.data || [];
        const normalized = rawBranches.map((b: any) => ({
          _id: b._id || b.id,
          branchCode: b.branchCode || '',
          branchName: b.branchName || b.name || 'Unnamed',
          addressLine: b.addressLine || '',
          city: b.city || '',
          state: b.state || '',
          postalCode: b.postalCode || '',
          country: b.country || 'Pakistan',
          phoneNumber: b.phoneNumber || b.phone || '',
          email: b.email || '',
          isActive: b.isActive ?? true,
          acceptsDelivery: b.acceptsDelivery ?? true,
          acceptsDineIn: b.acceptsDineIn ?? true,
          acceptsTakeaway: b.acceptsTakeaway ?? true,
          currency: b.currency || 'PKR',
          deliveryRadius: b.deliveryRadius || 5000,
        }));
        setBranches(normalized);
      }
    } catch (err) {
      console.error('Error loading branches:', err);
      setError('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (branch?: BranchItem) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        branchCode: branch.branchCode,
        branchName: branch.branchName,
        addressLine: branch.addressLine,
        city: branch.city,
        state: branch.state || '',
        postalCode: branch.postalCode || '',
        country: branch.country || 'Pakistan',
        phoneNumber: branch.phoneNumber || '',
        email: branch.email || '',
        isActive: branch.isActive ?? true,
        acceptsDelivery: branch.acceptsDelivery ?? true,
        acceptsDineIn: branch.acceptsDineIn ?? true,
        acceptsTakeaway: branch.acceptsTakeaway ?? true,
        currency: branch.currency || 'PKR',
        deliveryRadius: branch.deliveryRadius || 5000,
      });
    } else {
      setEditingBranch(null);
      setFormData({
        branchCode: '',
        branchName: '',
        addressLine: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Pakistan',
        phoneNumber: '',
        email: '',
        isActive: true,
        acceptsDelivery: true,
        acceptsDineIn: true,
        acceptsTakeaway: true,
        currency: 'PKR',
        deliveryRadius: 5000,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingBranch(null);
    setError('');
  };

  const handleSave = async () => {
    if (!formData.branchName.trim() || !formData.branchCode.trim()) {
      setError('Branch name and code are required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      let response: any;
      if (editingBranch) {
        response = await api.updateBranch(editingBranch._id, formData);
      } else {
        response = await api.createBranch(formData);
      }

      if (response?.success) {
        handleCloseDialog();
        loadBranches();
      } else {
        setError(response?.message || 'Failed to save branch');
      }
    } catch (err: any) {
      console.error('[AdminBranches] Error:', err);
      // Extract detailed validation errors if available
      const responseData = err?.response?.data;
      if (responseData?.message) {
        setError(responseData.message);
      } else if (responseData?.errors && Array.isArray(responseData.errors)) {
        setError(responseData.errors.map((e: any) => e.message || e).join(', '));
      } else {
        setError(err?.message || 'Failed to save branch');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this branch?')) return;

    try {
      const response: any = await api.deleteBranch(id);
      if (response?.success) {
        loadBranches();
      }
    } catch (err) {
      console.error('Error deleting branch:', err);
    }
  };

  const handleToggleActive = async (branch: BranchItem) => {
    try {
      const response: any = branch.isActive 
        ? await api.deactivateBranch(branch._id)
        : await api.activateBranch(branch._id);
      if (response?.success) {
        loadBranches();
      }
    } catch (err) {
      console.error('Error toggling branch status:', err);
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f8f5ff', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>
          Branches
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{
            bgcolor: '#FF6B35',
            '&:hover': { bgcolor: '#E55A24' },
            borderRadius: 2,
            textTransform: 'none',
          }}
        >
          Add Branch
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={3}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, md: 6 }}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Skeleton variant="text" width="40%" />
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="80%" />
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : branches.length === 0 ? (
          <Grid size={12}>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Store sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
              <Typography color="#999">No branches found</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
                sx={{ mt: 2, bgcolor: '#FF6B35', '&:hover': { bgcolor: '#E55A24' } }}
              >
                Create First Branch
              </Button>
            </Box>
          </Grid>
        ) : (
          branches.map((branch) => (
            <Grid key={branch._id} size={{ xs: 12, md: 6 }}>
              <Card
                sx={{
                  borderRadius: 2,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {branch.branchName}
                      </Typography>
                      <Typography variant="caption" color="#999">
                        {branch.branchCode}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={branch.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          bgcolor: branch.isActive ? '#E8F5E9' : '#FFEBEE',
                          color: branch.isActive ? '#4CAF50' : '#F44336',
                          fontSize: 11,
                        }}
                      />
                      <IconButton size="small" onClick={() => handleToggleActive(branch)}>
                        <Switch checked={branch.isActive} size="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn sx={{ fontSize: 16, color: '#999' }} />
                      <Typography variant="body2" color="textSecondary">
                        {branch.addressLine}, {branch.city}
                      </Typography>
                    </Box>
                    {branch.phoneNumber && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Phone sx={{ fontSize: 16, color: '#999' }} />
                        <Typography variant="body2" color="textSecondary">
                          {branch.phoneNumber}
                        </Typography>
                      </Box>
                    )}
                    {branch.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Email sx={{ fontSize: 16, color: '#999' }} />
                        <Typography variant="body2" color="textSecondary">
                          {branch.email}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Chip
                      label="Delivery"
                      size="small"
                      sx={{
                        bgcolor: branch.acceptsDelivery ? '#E3F2FD' : '#F5F5F5',
                        color: branch.acceptsDelivery ? '#1976D2' : '#999',
                        fontSize: 10,
                      }}
                    />
                    <Chip
                      label="Dine In"
                      size="small"
                      sx={{
                        bgcolor: branch.acceptsDineIn ? '#E8F5E9' : '#F5F5F5',
                        color: branch.acceptsDineIn ? '#4CAF50' : '#999',
                        fontSize: 10,
                      }}
                    />
                    <Chip
                      label="Takeaway"
                      size="small"
                      sx={{
                        bgcolor: branch.acceptsTakeaway ? '#FFF3E0' : '#F5F5F5',
                        color: branch.acceptsTakeaway ? '#FF9800' : '#999',
                        fontSize: 10,
                      }}
                    />
                    <Chip
                      label={branch.currency}
                      size="small"
                      sx={{ bgcolor: '#F3E5F5', color: '#9C27B0', fontSize: 10 }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <IconButton size="small" onClick={() => handleOpenDialog(branch)}>
                      <Edit sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(branch._id)}>
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
        <DialogTitle>{editingBranch ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={6}>
              <TextField
                label="Branch Code"
                fullWidth
                value={formData.branchCode}
                onChange={(e) => setFormData({ ...formData, branchCode: e.target.value.toUpperCase() })}
                placeholder="AB001"
                required
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Branch Name"
                fullWidth
                value={formData.branchName}
                onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                required
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Address"
                fullWidth
                value={formData.addressLine}
                onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
                required
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="City"
                fullWidth
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="State/Province"
                fullWidth
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Phone"
                fullWidth
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Email"
                fullWidth
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Currency"
                select
                fullWidth
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              >
                <MenuItem value="PKR">PKR - Pakistani Rupee</MenuItem>
                <MenuItem value="USD">USD - US Dollar</MenuItem>
                <MenuItem value="EUR">EUR - Euro</MenuItem>
                <MenuItem value="GBP">GBP - British Pound</MenuItem>
                <MenuItem value="AED">AED - UAE Dirham</MenuItem>
                <MenuItem value="SAR">SAR - Saudi Riyal</MenuItem>
                <MenuItem value="INR">INR - Indian Rupee</MenuItem>
              </TextField>
            </Grid>
            <Grid size={6}>
              <TextField
                label="Delivery Radius (meters)"
                type="number"
                fullWidth
                value={formData.deliveryRadius}
                onChange={(e) => setFormData({ ...formData, deliveryRadius: parseInt(e.target.value) || 5000 })}
              />
            </Grid>
            <Grid size={12}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControlLabel
                  control={<Switch checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />}
                  label="Active"
                />
                <FormControlLabel
                  control={<Switch checked={formData.acceptsDelivery} onChange={(e) => setFormData({ ...formData, acceptsDelivery: e.target.checked })} />}
                  label="Delivery"
                />
                <FormControlLabel
                  control={<Switch checked={formData.acceptsDineIn} onChange={(e) => setFormData({ ...formData, acceptsDineIn: e.target.checked })} />}
                  label="Dine In"
                />
                <FormControlLabel
                  control={<Switch checked={formData.acceptsTakeaway} onChange={(e) => setFormData({ ...formData, acceptsTakeaway: e.target.checked })} />}
                  label="Takeaway"
                />
              </Box>
            </Grid>
          </Grid>
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

export default AdminBranches;
