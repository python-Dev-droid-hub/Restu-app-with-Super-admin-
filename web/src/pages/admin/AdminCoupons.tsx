import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  LocalOffer,
  Percent,
  AttachMoney,
} from '@mui/icons-material';
import { api } from '../../services/api';

interface CouponItem {
  _id: string;
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  maxUsage?: number;
  maxUsagePerCustomer?: number;
  startDate: string;
  expiryDate: string;
  isActive: boolean;
  usageCount?: number;
}

const AdminCoupons: React.FC = () => {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
    discountValue: 0,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    maxUsage: 100,
    maxUsagePerCustomer: 1,
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
  });

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const response: any = await api.getCoupons();
      if (response?.success) {
        const rawCoupons = response.data?.coupons || response.data || [];
        const normalized = rawCoupons.map((c: any) => ({
          _id: c._id || c.id,
          code: c.code || '',
          description: c.description || '',
          discountType: c.discountType || 'PERCENTAGE',
          discountValue: c.discountValue || 0,
          minOrderAmount: c.minOrderAmount || 0,
          maxDiscountAmount: c.maxDiscountAmount || 0,
          maxUsage: c.maxUsage || 100,
          maxUsagePerCustomer: c.maxUsagePerCustomer || 1,
          startDate: c.startDate || new Date().toISOString(),
          expiryDate: c.expiryDate || new Date().toISOString(),
          isActive: c.isActive ?? true,
          usageCount: c.usageCount || 0,
        }));
        setCoupons(normalized);
      }
    } catch (err) {
      console.error('Error loading coupons:', err);
      setError('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (coupon?: CouponItem) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        description: coupon.description || '',
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount || 0,
        maxDiscountAmount: coupon.maxDiscountAmount || 0,
        maxUsage: coupon.maxUsage || 100,
        maxUsagePerCustomer: coupon.maxUsagePerCustomer || 1,
        startDate: new Date(coupon.startDate).toISOString().split('T')[0],
        expiryDate: new Date(coupon.expiryDate).toISOString().split('T')[0],
        isActive: coupon.isActive,
      });
    } else {
      setEditingCoupon(null);
      setFormData({
        code: '',
        description: '',
        discountType: 'PERCENTAGE',
        discountValue: 0,
        minOrderAmount: 0,
        maxDiscountAmount: 0,
        maxUsage: 100,
        maxUsagePerCustomer: 1,
        startDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCoupon(null);
    setError('');
  };

  const handleSave = async () => {
    if (!formData.code.trim()) {
      setError('Coupon code is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      let response: any;
      if (editingCoupon) {
        response = await api.updateCoupon(editingCoupon._id, formData);
      } else {
        response = await api.createCoupon(formData);
      }

      if (response?.success) {
        handleCloseDialog();
        loadCoupons();
      } else {
        setError(response?.message || 'Failed to save coupon');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const response: any = await api.deleteCoupon(id);
      if (response?.success) {
        loadCoupons();
      }
    } catch (err) {
      console.error('Error deleting coupon:', err);
    }
  };

  const isExpired = (expiryDate: string) => new Date(expiryDate) < new Date();

  return (
    <Box sx={{ p: 3, bgcolor: '#f8f5ff', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>
          Coupons
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
          Add Coupon
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Discount</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Min Order</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Usage</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Validity</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton variant="text" width={100} /></TableCell>
                  <TableCell><Skeleton variant="text" width={80} /></TableCell>
                  <TableCell><Skeleton variant="text" width={60} /></TableCell>
                  <TableCell><Skeleton variant="text" width={60} /></TableCell>
                  <TableCell><Skeleton variant="text" width={100} /></TableCell>
                  <TableCell><Skeleton variant="text" width={60} /></TableCell>
                  <TableCell><Skeleton variant="text" width={80} /></TableCell>
                </TableRow>
              ))
            ) : coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <LocalOffer sx={{ fontSize: 40, color: '#ccc', mb: 1 }} />
                  <Typography color="#999">No coupons found</Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenDialog()}
                    sx={{ mt: 2, bgcolor: '#FF6B35', '&:hover': { bgcolor: '#E55A24' } }}
                  >
                    Create First Coupon
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon) => (
                <TableRow key={coupon._id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocalOffer sx={{ color: '#FF6B35' }} />
                      <Typography sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                        {coupon.code}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {coupon.discountType === 'PERCENTAGE' ? (
                        <Percent sx={{ fontSize: 16, color: '#4CAF50' }} />
                      ) : (
                        <AttachMoney sx={{ fontSize: 16, color: '#2196F3' }} />
                      )}
                      <Typography>
                        {coupon.discountType === 'PERCENTAGE' 
                          ? `${coupon.discountValue}%` 
                          : `$${coupon.discountValue}`}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      ${coupon.minOrderAmount || 0}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {coupon.usageCount || 0}/{coupon.maxUsage}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {new Date(coupon.startDate).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color={isExpired(coupon.expiryDate) ? 'error' : '#999'}>
                        to {new Date(coupon.expiryDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={isExpired(coupon.expiryDate) ? 'Expired' : coupon.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        bgcolor: isExpired(coupon.expiryDate) ? '#FFEBEE' : coupon.isActive ? '#E8F5E9' : '#FFF3E0',
                        color: isExpired(coupon.expiryDate) ? '#F44336' : coupon.isActive ? '#4CAF50' : '#FF9800',
                        fontSize: 11,
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpenDialog(coupon)}>
                      <Edit sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(coupon._id)}>
                      <Delete sx={{ fontSize: 18 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCoupon ? 'Edit Coupon' : 'Add Coupon'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Coupon Code"
              fullWidth
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              inputProps={{ style: { fontFamily: 'monospace', fontWeight: 'bold' } }}
              required
            />
            <TextField
              label="Description"
              fullWidth
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Grid container spacing={2}>
              <Grid size={6}>
                <FormControl fullWidth>
                  <InputLabel>Discount Type</InputLabel>
                  <Select
                    value={formData.discountType}
                    label="Discount Type"
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                  >
                    <MenuItem value="PERCENTAGE">Percentage</MenuItem>
                    <MenuItem value="FIXED_AMOUNT">Fixed Amount</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Discount Value"
                  type="number"
                  fullWidth
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                  InputProps={{
                    startAdornment: formData.discountType === 'PERCENTAGE' ? '%' : '$',
                  }}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label="Min Order Amount"
                  type="number"
                  fullWidth
                  value={formData.minOrderAmount}
                  onChange={(e) => setFormData({ ...formData, minOrderAmount: parseFloat(e.target.value) || 0 })}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Max Discount"
                  type="number"
                  fullWidth
                  value={formData.maxDiscountAmount}
                  onChange={(e) => setFormData({ ...formData, maxDiscountAmount: parseFloat(e.target.value) || 0 })}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label="Max Usage"
                  type="number"
                  fullWidth
                  value={formData.maxUsage}
                  onChange={(e) => setFormData({ ...formData, maxUsage: parseInt(e.target.value) || 100 })}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Max Per Customer"
                  type="number"
                  fullWidth
                  value={formData.maxUsagePerCustomer}
                  onChange={(e) => setFormData({ ...formData, maxUsagePerCustomer: parseInt(e.target.value) || 1 })}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label="Start Date"
                  type="date"
                  fullWidth
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Expiry Date"
                  type="date"
                  fullWidth
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            <FormControlLabel
              control={<Switch checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />}
              label="Active"
            />
          </Box>
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

export default AdminCoupons;
