import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Avatar,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Skeleton,
  Tooltip,
  Alert,
  CircularProgress,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Add, Edit, Delete, Refresh, CloudUpload } from '@mui/icons-material';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';

interface Deal {
  _id: string;
  title: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  startDate: string;
  expiryDate: string;
  imageUrl?: string;
  isActive: boolean;
  branch?: { _id: string; branchName: string }[] | null;
  products?: { product: { _id: string; name: string } }[];
}

interface Branch {
  _id: string;
  branchName: string;
}

interface ProductOption {
  _id: string;
  name: string;
  branchName?: string;
  isAvailable?: boolean;
}

const AdminDeals: React.FC = () => {
  const { currencySymbol } = useSettings();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [deals, setDeals] = useState<Deal[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    maxDiscountAmount: string;
    minOrderAmount: string;
    startDate: string;
    expiryDate: string;
    imageUrl: string;
    branch: string[];
    products: string[];
    isActive: boolean;
    excludeCoupons: boolean;
  }>({
    title: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: 0,
    maxDiscountAmount: '',
    minOrderAmount: '0',
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    imageUrl: '',
    branch: [],
    products: [],
    isActive: true,
    excludeCoupons: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dealsRes, branchesRes, productsRes]: [any, any, any] = await Promise.all([
        api.getDeals(),
        api.getAllBranches().catch(() => ({ success: false, data: [] })),
        api.getAdminProducts({ limit: 500 }).catch(() => ({ success: false, data: [] })),
      ]);

      if (dealsRes?.success) {
        setDeals(dealsRes.data?.deals || dealsRes.data?.data?.deals || []);
      } else if (dealsRes?.error) {
        setError(String(dealsRes.error));
      }

      if (branchesRes?.success) {
        const rawList = branchesRes?.data?.branches || branchesRes?.data?.data?.branches || branchesRes?.data || [];
        setBranches(Array.isArray(rawList) ? rawList : []);
      }

      if (productsRes?.success) {
        const rawProducts = productsRes?.data?.products || productsRes?.data?.data?.products || productsRes?.data || [];
        const normalizedProducts = (Array.isArray(rawProducts) ? rawProducts : []).map((product: any) => {
          const doc = product?._doc || product;
          return {
            _id: String(doc?._id || product?._id || ''),
            name: String(doc?.name || product?.name || 'Unnamed product'),
            branchName: doc?.branch?.branchName || product?.branch?.branchName || doc?.branchName || product?.branchName || '',
            isAvailable: doc?.isAvailable ?? product?.isAvailable ?? true,
          };
        });
        setProducts(normalizedProducts);
      }
    } catch (err: any) {
      console.error('Error loading deals:', err);
      setError(err?.response?.data?.message || 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (deal?: Deal) => {
    if (deal) {
      setEditingDeal(deal);
      setDialogError(null);
      setFormData({
        title: deal.title,
        description: deal.description || '',
        discountType: deal.discountType,
        discountValue: deal.discountValue,
        maxDiscountAmount: deal.maxDiscountAmount?.toString() || '',
        minOrderAmount: deal.minOrderAmount?.toString() || '0',
        startDate: new Date(deal.startDate).toISOString().split('T')[0],
        expiryDate: new Date(deal.expiryDate).toISOString().split('T')[0],
        imageUrl: deal.imageUrl || '',
        branch: Array.isArray(deal.branch) ? deal.branch.map((b: any) => b._id || b) : (deal.branch ? [(deal.branch as any)._id || deal.branch] : []),
        products: Array.isArray(deal.products) ? deal.products.map((item: any) => item?.product?._id || item?.product).filter(Boolean) : [],
        isActive: deal.isActive,
        excludeCoupons: true,
      });
    } else {
      setEditingDeal(null);
      setDialogError(null);
      setFormData({
        title: '',
        description: '',
        discountType: 'PERCENTAGE',
        discountValue: 0,
        maxDiscountAmount: '',
        minOrderAmount: '0',
        startDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        imageUrl: '',
        branch: [],
        products: [],
        isActive: true,
        excludeCoupons: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDeal(null);
    setDialogError(null);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      setDialogError('Deal title is required');
      return;
    }

    if (formData.discountValue <= 0) {
      setDialogError('Discount value must be greater than 0');
      return;
    }

    if (formData.discountType === 'PERCENTAGE' && formData.discountValue > 100) {
      setDialogError('Percentage discount cannot exceed 100');
      return;
    }

    if (Number(formData.minOrderAmount) < 0) {
      setDialogError('Minimum order amount cannot be negative');
      return;
    }

    if (formData.maxDiscountAmount && Number(formData.maxDiscountAmount) < 0) {
      setDialogError('Maximum discount amount cannot be negative');
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.expiryDate)) {
      setDialogError('Expiry date must be after start date');
      return;
    }

    try {
      setDialogError(null);
      const data: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        minOrderAmount: Number(formData.minOrderAmount) || 0,
        startDate: new Date(formData.startDate),
        expiryDate: new Date(formData.expiryDate),
        isActive: formData.isActive,
        excludeCoupons: formData.excludeCoupons,
        imageUrl: formData.imageUrl || undefined,
        branch: formData.branch && formData.branch.length > 0 ? formData.branch : undefined,
        products: formData.products,
      };

      if (formData.maxDiscountAmount) {
        data.maxDiscountAmount = Number(formData.maxDiscountAmount);
      }

      if (editingDeal) {
        await api.updateDeal(editingDeal._id, data);
      } else {
        await api.createDeal(data);
      }
      handleCloseDialog();
      loadData();
    } catch (err: any) {
      console.error('Error saving deal:', err);
      setError(err?.response?.data?.message || 'Failed to save deal');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this deal?')) {
      try {
        await api.deleteDeal(id);
        loadData();
      } catch (err: any) {
        console.error('Error deleting deal:', err);
        setError(err?.response?.data?.message || 'Failed to delete deal');
      }
    }
  };

  const handleToggleActive = async (deal: Deal) => {
    try {
      await api.updateDeal(deal._id, { isActive: !deal.isActive });
      loadData();
    } catch (err: any) {
      console.error('Error toggling deal status:', err);
      setError(err?.response?.data?.message || 'Failed to update deal status');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setDialogError(null);
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(file);
      });

      const response: any = await api.uploadImage(base64, file.name);
      if (response?.success && response?.data?.url) {
        setFormData((prev) => ({ ...prev, imageUrl: response.data.url }));
      } else {
        setDialogError(response?.message || response?.error || 'Failed to upload image');
      }
    } catch (uploadError: any) {
      console.error('Error uploading deal image:', uploadError);
      setDialogError(uploadError?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const formatDiscount = (deal: Deal) => {
    if (deal.discountType === 'PERCENTAGE') {
      return `${deal.discountValue}% OFF`;
    }
    return `${currencySymbol}${deal.discountValue} OFF`;
  };

  return (
    <Container maxWidth="lg" sx={{ pb: { xs: 2, md: 3 }, pt: 0 }}>
      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a1a2e' }}>
                Deals Management
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Manage promotional deals and discounts
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadData}
                sx={{ borderRadius: 2 }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
                sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#e55a2b' }, borderRadius: 2 }}
              >
                Add Deal
              </Button>
            </Box>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Stats */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Paper sx={{ p: 2, borderRadius: 2, flex: '1 1 220px', bgcolor: '#FFF3E0' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#FF6B35' }}>
                {loading ? <Skeleton width={40} /> : deals.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">Total Deals</Typography>
            </Paper>
            <Paper sx={{ p: 2, borderRadius: 2, flex: '1 1 220px', bgcolor: '#E8F5E9' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                {loading ? <Skeleton width={40} /> : deals.filter(d => d.isActive).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">Active Deals</Typography>
            </Paper>
            <Paper sx={{ p: 2, borderRadius: 2, flex: '1 1 220px', bgcolor: '#FFEBEE' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#F44336' }}>
                {loading ? <Skeleton width={40} /> : deals.filter(d => !d.isActive).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">Inactive Deals</Typography>
            </Paper>
          </Box>

          {/* Table */}
          <TableContainer
            component={Paper}
            sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #f0f0f0', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
          >
            <Table size={isMobile ? 'small' : 'medium'} sx={{ minWidth: 980 }}>
              <TableHead sx={{ bgcolor: '#f8f5ff' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Discount</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Products</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Branch</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Valid Period</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  [1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton width={80} /></TableCell>
                      <TableCell><Skeleton width={120} /></TableCell>
                      <TableCell><Skeleton width={100} /></TableCell>
                      <TableCell><Skeleton width={150} /></TableCell>
                      <TableCell><Skeleton width={60} /></TableCell>
                      <TableCell><Skeleton width={100} /></TableCell>
                    </TableRow>
                  ))
                ) : deals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="textSecondary">No deals found. Create your first deal!</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  deals.map((deal) => (
                    <TableRow key={deal._id} hover>
                      <TableCell>
                        <Box>
                          <Typography sx={{ fontWeight: 600 }}>{deal.title}</Typography>
                          {deal.description && (
                            <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {deal.description}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={formatDiscount(deal)}
                          size="small"
                          sx={{ bgcolor: '#FF6B35', color: 'white', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        {deal.products && deal.products.length > 0 ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {deal.products.slice(0, 2).map((item) => (
                              <Chip
                                key={item.product._id}
                                label={item.product.name}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                            {deal.products.length > 2 && (
                              <Chip
                                label={`+${deal.products.length - 2} more`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            All products
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {deal.branch && deal.branch.length > 0 ? deal.branch.map(b => b.branchName).join(', ') : 'All Branches'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(deal.startDate)} - {formatDate(deal.expiryDate)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={deal.isActive}
                          onChange={() => handleToggleActive(deal)}
                          color="success"
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleOpenDialog(deal)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDelete(deal._id)} color="error">
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingDeal ? 'Edit Deal' : 'Add New Deal'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {dialogError && <Alert severity="error">{dialogError}</Alert>}
            <TextField
              label="Title"
              fullWidth
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button
                component="label"
                variant="outlined"
                startIcon={uploadingImage ? <CircularProgress size={16} /> : <CloudUpload />}
                disabled={uploadingImage}
              >
                {uploadingImage ? 'Uploading...' : 'Upload Image'}
                <input hidden type="file" accept="image/*" onChange={handleImageUpload} />
              </Button>
              {formData.imageUrl ? (
                <>
                  <Avatar
                    variant="rounded"
                    src={api.getImageUrl(formData.imageUrl)}
                    sx={{ width: 72, height: 48 }}
                  />
                  <Button color="inherit" onClick={() => setFormData({ ...formData, imageUrl: '' })}>
                    Remove Image
                  </Button>
                </>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No image selected
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Discount Type</InputLabel>
                <Select
                  value={formData.discountType}
                  label="Discount Type"
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT' })}
                >
                  <MenuItem value="PERCENTAGE">Percentage (%)</MenuItem>
                  <MenuItem value="FIXED_AMOUNT">Fixed Amount ({currencySymbol})</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={formData.discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount Amount'}
                type="number"
                fullWidth
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Max Discount Amount"
                type="number"
                fullWidth
                value={formData.maxDiscountAmount}
                onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                helperText="Optional - Maximum discount cap"
              />
              <TextField
                label="Min Order Amount"
                type="number"
                fullWidth
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                helperText="Minimum order to qualify"
              />
            </Box>
            <FormControl fullWidth>
              <InputLabel>Products</InputLabel>
              <Select
                multiple
                value={formData.products}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    products: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value,
                  })
                }
                label="Products"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).length === 0 ? (
                      <Chip label="All products" size="small" />
                    ) : (
                      (selected as string[]).map((id) => {
                        const product = products.find((item) => item._id === id);
                        return <Chip key={id} label={product?.name || id} size="small" />;
                      })
                    )}
                  </Box>
                )}
              >
                {products.map((product) => (
                  <MenuItem key={product._id} value={product._id}>
                    {product.name}
                    {product.branchName ? ` (${product.branchName})` : ''}
                    {product.isAvailable === false ? ' • Unavailable' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="textSecondary" sx={{ mt: -1 }}>
              Select one or more products, or leave empty to make the deal available for all products.
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Branches</InputLabel>
              <Select
                multiple
                value={formData.branch || []}
                onChange={(e) => setFormData({ ...formData, branch: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
                label="Branches"
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
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Expiry Date"
                type="date"
                fullWidth
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.excludeCoupons}
                  onChange={(e) => setFormData({ ...formData, excludeCoupons: e.target.checked })}
                  color="success"
                />
              }
              label="Exclude coupons when this deal applies"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  color="success"
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formData.title || formData.discountValue <= 0}
            sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#e55a2b' } }}
          >
            {editingDeal ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDeals;
