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
} from '@mui/material';
import { Add, Edit, Delete, Refresh } from '@mui/icons-material';
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
  branch?: { _id: string; branchName: string } | null;
  products?: { product: { _id: string; name: string } }[];
}

interface Branch {
  _id: string;
  branchName: string;
}

const AdminDeals: React.FC = () => {
  const { currencySymbol } = useSettings();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    maxDiscountAmount: string;
    minOrderAmount: string;
    startDate: string;
    expiryDate: string;
    branch: string;
    isActive: boolean;
  }>({
    title: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: 0,
    maxDiscountAmount: '',
    minOrderAmount: '0',
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    branch: '',
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dealsRes, branchesRes]: [any, any] = await Promise.all([
        api.getDeals(),
        api.getAllBranches().catch(() => ({ success: false, data: [] })),
      ]);

      if (dealsRes?.success) {
        setDeals(dealsRes.data?.deals || []);
      }

      if (branchesRes?.success) {
        const rawList = branchesRes?.data?.branches || branchesRes?.data?.data?.branches || branchesRes?.data || [];
        setBranches(Array.isArray(rawList) ? rawList : []);
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
      setFormData({
        title: deal.title,
        description: deal.description || '',
        discountType: deal.discountType,
        discountValue: deal.discountValue,
        maxDiscountAmount: deal.maxDiscountAmount?.toString() || '',
        minOrderAmount: deal.minOrderAmount?.toString() || '0',
        startDate: new Date(deal.startDate).toISOString().split('T')[0],
        expiryDate: new Date(deal.expiryDate).toISOString().split('T')[0],
        branch: deal.branch?._id || '',
        isActive: deal.isActive,
      });
    } else {
      setEditingDeal(null);
      setFormData({
        title: '',
        description: '',
        discountType: 'PERCENTAGE',
        discountValue: 0,
        maxDiscountAmount: '',
        minOrderAmount: '0',
        startDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        branch: '',
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDeal(null);
  };

  const handleSave = async () => {
    try {
      const data: any = {
        title: formData.title,
        description: formData.description,
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        minOrderAmount: Number(formData.minOrderAmount) || 0,
        startDate: new Date(formData.startDate),
        expiryDate: new Date(formData.expiryDate),
        isActive: formData.isActive,
        branch: formData.branch || null,
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

  const formatDiscount = (deal: Deal) => {
    if (deal.discountType === 'PERCENTAGE') {
      return `${deal.discountValue}% OFF`;
    }
    return `${currencySymbol}${deal.discountValue} OFF`;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a1a2e' }}>
                Deals Management
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Manage promotional deals and discounts
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
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
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Paper sx={{ p: 2, borderRadius: 2, flex: 1, bgcolor: '#FFF3E0' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#FF6B35' }}>
                {loading ? <Skeleton width={40} /> : deals.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">Total Deals</Typography>
            </Paper>
            <Paper sx={{ p: 2, borderRadius: 2, flex: 1, bgcolor: '#E8F5E9' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                {loading ? <Skeleton width={40} /> : deals.filter(d => d.isActive).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">Active Deals</Typography>
            </Paper>
            <Paper sx={{ p: 2, borderRadius: 2, flex: 1, bgcolor: '#FFEBEE' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#F44336' }}>
                {loading ? <Skeleton width={40} /> : deals.filter(d => !d.isActive).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">Inactive Deals</Typography>
            </Paper>
          </Box>

          {/* Table */}
          <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #f0f0f0' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8f5ff' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Discount</TableCell>
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
                      <TableCell><Skeleton width={100} /></TableCell>
                      <TableCell><Skeleton width={150} /></TableCell>
                      <TableCell><Skeleton width={60} /></TableCell>
                      <TableCell><Skeleton width={100} /></TableCell>
                    </TableRow>
                  ))
                ) : deals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
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
                        {deal.branch?.branchName || 'All Branches'}
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
              <InputLabel>Branch</InputLabel>
              <Select
                value={formData.branch}
                label="Branch"
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              >
                <MenuItem value="">All Branches</MenuItem>
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
