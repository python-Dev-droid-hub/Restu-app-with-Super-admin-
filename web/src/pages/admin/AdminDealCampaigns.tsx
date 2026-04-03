import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  OutlinedInput,
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
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Avatar,
  Badge,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  LocalOffer,
  Image as ImageIcon,
  ArrowBack,
} from '@mui/icons-material';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';



interface DealItem {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  categories?: any[];
  price: number;
  originalPrice?: number;
  discount?: number;
  isActive?: boolean;
  displayOrder?: number;
  items?: Array<{
    productId?: string;
    productName?: string;
    quantity?: number;
    price?: number;
  }>;
}

interface Campaign {
  _id: string;
  name: string;
  description?: string;
  heroBanner?: {
    imageUrl?: string;
    title?: string;
    subtitle?: string;
    bgColor?: string;
  };
  deals: DealItem[];
  status: 'ACTIVE' | 'INACTIVE' | 'SCHEDULED';
  startDate?: string;
  endDate?: string;
  displayOrder?: number;
  category?: string;
  categories?: any[];
  branch?: string;
}

interface MenuCategory {
  _id: string;
  name: string;
  isActive?: boolean;
}

const AdminDealCampaigns: React.FC = () => {
  const { currencySymbol, formatPrice } = useSettings();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCampaignCategoryIds, setSelectedCampaignCategoryIds] = useState<string[]>([]);
  const [selectedDealCategoryIds, setSelectedDealCategoryIds] = useState<string[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');

  // Campaign Dialog
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    heroBannerImageUrl: '',
    heroBannerTitle: '',
    heroBannerSubtitle: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SCHEDULED',
    startDate: '',
    endDate: '',
    displayOrder: 0,
    category: '',
    branch: [] as string[],
  });

  // Deal Item Dialog
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DealItem | null>(null);
  const [savingDeal, setSavingDeal] = useState(false);
  const [dealForm, setDealForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    price: 0,
    originalPrice: 0,
    displayOrder: 0,
    isActive: true,
  });

  useEffect(() => {
    loadCampaigns();
    loadCategories();
    loadBranches();
  }, [selectedBranchFilter]);

  const loadBranches = async () => {
    try {
      const response: any = await api.getAllBranches();
      if (response?.success) {
        setBranches(response.data?.branches || response.data || []);
      }
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  };

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const url = selectedBranchFilter === 'all' 
        ? '/deals/campaigns' 
        : `/deals/campaigns?branchId=${selectedBranchFilter}`;
      const response: any = await api.get(url);
      if (response?.success) {
        setCampaigns(response.data?.campaigns || []);
      }
    } catch (err) {
      console.error('Error loading campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response: any = await api.get('/menu/admin/categories');
      const list = response?.data?.categories || response?.data || [];
      if (response?.success && Array.isArray(list)) {
        setCategories(list);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const uploadBase64Image = async (file: File) => {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
    return api.uploadImage(base64Data, file.name);
  };

  const handleOpenCampaignDialog = (campaign?: Campaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setCampaignForm({
        name: campaign.name,
        description: campaign.description || '',
        heroBannerImageUrl: campaign.heroBanner?.imageUrl || '',
        heroBannerTitle: campaign.heroBanner?.title || '',
        heroBannerSubtitle: campaign.heroBanner?.subtitle || '',
        status: campaign.status,
        startDate: campaign.startDate ? campaign.startDate.split('T')[0] : '',
        endDate: campaign.endDate ? campaign.endDate.split('T')[0] : '',
        displayOrder: campaign.displayOrder || 0,
        category: campaign.category || '',
        branch: Array.isArray(campaign.branch) ? campaign.branch : (campaign.branch ? [campaign.branch] : []),
      });
      setSelectedCampaignCategoryIds(
        Array.isArray(campaign.categories)
          ? campaign.categories.map((c: any) => String(c?._id || c))
          : []
      );
    } else {
      setEditingCampaign(null);
      setCampaignForm({
        name: '',
        description: '',
        heroBannerImageUrl: '',
        heroBannerTitle: '',
        heroBannerSubtitle: '',
        status: 'ACTIVE',
        startDate: '',
        endDate: '',
        displayOrder: 0,
        category: '',
        branch: [] as string[],
      });
      setSelectedCampaignCategoryIds([]);
    }
    setCampaignDialogOpen(true);
  };

  const handleCloseCampaignDialog = () => {
    setCampaignDialogOpen(false);
    setEditingCampaign(null);
  };

  const handleSaveCampaign = async () => {
    if (!campaignForm.name.trim()) {
      alert('Campaign name is required');
      return;
    }

    try {
      setSavingCampaign(true);
      const data: any = {
        name: campaignForm.name,
        description: campaignForm.description || undefined,
        heroBanner: {
          imageUrl: campaignForm.heroBannerImageUrl || undefined,
          title: campaignForm.heroBannerTitle || undefined,
          subtitle: campaignForm.heroBannerSubtitle || undefined,
        },
        status: campaignForm.status,
        startDate: campaignForm.startDate || undefined,
        endDate: campaignForm.endDate || undefined,
        displayOrder: campaignForm.displayOrder,
        category: campaignForm.category || undefined,
        categories: selectedCampaignCategoryIds.length > 0 ? selectedCampaignCategoryIds : undefined,
        branch: campaignForm.branch && campaignForm.branch.length > 0 ? campaignForm.branch : undefined,
      };

      let response;
      if (editingCampaign) {
        response = await api.patch(`/deals/campaigns/${editingCampaign._id}`, data);
      } else {
        response = await api.post('/deals/campaigns', data);
      }

      if (response?.success) {
        alert(`Campaign ${editingCampaign ? 'updated' : 'created'} successfully`);
        handleCloseCampaignDialog();
        loadCampaigns();
      } else {
        alert(response?.message || 'Failed to save campaign');
      }
    } catch (err: any) {
      console.error('Error saving campaign:', err);
      alert(err.response?.data?.message || 'Failed to save campaign');
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign and all its deals?')) {
      return;
    }

    try {
      const response = await api.delete(`/deals/campaigns/${campaignId}`);
      if (response?.success) {
        loadCampaigns();
      }
    } catch (err) {
      console.error('Error deleting campaign:', err);
    }
  };

  const handleToggleCampaignStatus = async (campaign: Campaign) => {
    try {
      const newStatus = campaign.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const response = await api.patch(`/deals/campaigns/${campaign._id}`, { status: newStatus });
      if (response?.success) {
        loadCampaigns();
      }
    } catch (err) {
      console.error('Error toggling campaign status:', err);
    }
  };

  const handleViewCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setSelectedCampaign(null);
    setViewMode('list');
  };

  // Deal Item Handlers
  const handleOpenDealDialog = (deal?: DealItem) => {
    if (deal) {
      setEditingDeal(deal);
      setDealForm({
        title: deal.title,
        description: deal.description || '',
        imageUrl: deal.imageUrl || '',
        price: deal.price,
        originalPrice: deal.originalPrice || 0,
        displayOrder: deal.displayOrder || 0,
        isActive: deal.isActive !== false,
      });
      setSelectedDealCategoryIds(
        Array.isArray(deal.categories) ? deal.categories.map((c: any) => String(c?._id || c)) : []
      );
    } else {
      setEditingDeal(null);
      setDealForm({
        title: '',
        description: '',
        imageUrl: '',
        price: 0,
        originalPrice: 0,
        displayOrder: 0,
        isActive: true,
      });
      setSelectedDealCategoryIds([]);
    }
    setDealDialogOpen(true);
  };

  const handleCloseDealDialog = () => {
    setDealDialogOpen(false);
    setEditingDeal(null);
  };

  const handleSaveDeal = async () => {
    if (!selectedCampaign) return;
    if (!dealForm.title.trim()) {
      alert('Deal title is required');
      return;
    }
    if (dealForm.price <= 0) {
      alert('Price must be greater than 0');
      return;
    }

    try {
      setSavingDeal(true);
      const data: any = {
        title: dealForm.title,
        description: dealForm.description || undefined,
        imageUrl: dealForm.imageUrl || undefined,
        price: dealForm.price,
        originalPrice: dealForm.originalPrice > 0 ? dealForm.originalPrice : undefined,
        displayOrder: dealForm.displayOrder,
        isActive: dealForm.isActive,
        categories: selectedDealCategoryIds.length > 0 ? selectedDealCategoryIds : undefined,
      };

      let response;
      if (editingDeal) {
        response = await api.patch(
          `/deals/campaigns/${selectedCampaign._id}/deals/${editingDeal._id}`,
          data
        );
      } else {
        response = await api.post(`/deals/campaigns/${selectedCampaign._id}/deals`, data);
      }

      if (response?.success) {
        alert(`Deal ${editingDeal ? 'updated' : 'added'} successfully`);
        handleCloseDealDialog();
        // Reload campaign data
        const campaignResponse = await api.get<{ campaign: Campaign }>(
          `/deals/campaigns/${selectedCampaign._id}`
        );
        if (campaignResponse?.success && campaignResponse.data?.campaign) {
          setSelectedCampaign(campaignResponse.data.campaign);
        }
        loadCampaigns();
      } else {
        alert(response?.message || 'Failed to save deal');
      }
    } catch (err: any) {
      console.error('Error saving deal:', err);
      alert(err.response?.data?.message || 'Failed to save deal');
    } finally {
      setSavingDeal(false);
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!selectedCampaign) return;
    if (!window.confirm('Are you sure you want to remove this deal?')) {
      return;
    }

    try {
      const response = await api.delete(
        `/deals/campaigns/${selectedCampaign._id}/deals/${dealId}`
      );
      if (response?.success) {
        // Update local state
        setSelectedCampaign({
          ...selectedCampaign,
          deals: selectedCampaign.deals.filter((d) => d._id !== dealId),
        });
        loadCampaigns();
      }
    } catch (err) {
      console.error('Error deleting deal:', err);
    }
  };

  const handleToggleDealStatus = async (deal: DealItem) => {
    if (!selectedCampaign) return;

    try {
      const response = await api.patch(
        `/deals/campaigns/${selectedCampaign._id}/deals/${deal._id}/toggle`
      );
      if (response?.success) {
        // Update local state
        setSelectedCampaign({
          ...selectedCampaign,
          deals: selectedCampaign.deals.map((d) =>
            d._id === deal._id ? { ...d, isActive: !d.isActive } : d
          ),
        });
        loadCampaigns();
      }
    } catch (err) {
      console.error('Error toggling deal status:', err);
    }
  };

  const discountPercent = (deal: DealItem) => {
    if (deal.discount) return deal.discount;
    if (deal.originalPrice && deal.originalPrice > deal.price) {
      return Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100);
    }
    return 0;
  };

  // Campaign List View
  if (viewMode === 'list') {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1a1a2e' }}>
            Deal Campaigns
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200, bgcolor: 'white' }}>
              <InputLabel>Filter by Branch</InputLabel>
              <Select
                value={selectedBranchFilter}
                label="Filter by Branch"
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
              >
                <MenuItem value="all">All Branches</MenuItem>
                <MenuItem value="global">Global (No Branch)</MenuItem>
                {branches.map((branch) => (
                  <MenuItem key={branch._id} value={branch._id}>
                    {branch.branchName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenCampaignDialog()}
              sx={{
                bgcolor: '#E87E35',
                '&:hover': { bgcolor: '#d66d2a' },
                textTransform: 'none',
                fontWeight: 'bold',
              }}
            >
              New Campaign
            </Button>
          </Box>
        </Box>

        {/* Stats */}
        <Grid container spacing={3} sx={{ mb: 3, width: '100%', m: 0 }}>
          <Grid size={{ xs: 12, sm: 4 }} sx={{ pl: '0 !important' }}>
            <Paper sx={{ p: 2, bgcolor: '#E87E35', color: 'white', borderRadius: 2, height: '100%' }}>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'white' }}>
                {campaigns.length}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, color: 'white' }}>
                Total Campaigns
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }} sx={{ pl: '0 !important' }}>
            <Paper sx={{ p: 2, bgcolor: '#4CAF50', color: 'white', borderRadius: 2, height: '100%' }}>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'white' }}>
                {campaigns.filter((c) => c.status === 'ACTIVE').length}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, color: 'white' }}>
                Active Campaigns
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }} sx={{ pl: '0 !important' }}>
            <Paper sx={{ p: 2, bgcolor: '#9C27B0', color: 'white', borderRadius: 2, height: '100%' }}>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'white' }}>
                {campaigns.reduce((sum, c) => sum + (c.deals?.length || 0), 0)}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, color: 'white' }}>
                Total Deals
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Campaigns Grid */}
        <Box sx={{ width: '100%', mt: 2 }}>
          {loading ? (
            <Grid container spacing={3} sx={{ width: '100%', m: 0 }}>
              {[1, 2, 3, 4].map((i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 6, lg: 4, xl: 3 }} sx={{ pl: '0 !important' }}>
                  <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
                </Grid>
              ))}
            </Grid>
          ) : campaigns.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2, width: '100%' }}>
              <LocalOffer sx={{ fontSize: 64, color: '#ddd', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                No campaigns found
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Create your first deal campaign to get started
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenCampaignDialog()}
                sx={{ bgcolor: '#E87E35', '&:hover': { bgcolor: '#d66d2a' } }}
              >
                Create Campaign
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3} sx={{ width: '100%', m: 0 }}>
              {campaigns.map((campaign) => (
                <Grid key={campaign._id} size={{ xs: 12, sm: 6, md: 6, lg: 4, xl: 3 }} sx={{ pl: '0 !important' }}>
                  <Card
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    },
                  }}
                  onClick={() => handleViewCampaign(campaign)}
                >
                  {campaign.heroBanner?.imageUrl ? (
                    <CardMedia
                      component="img"
                      height="140"
                      image={api.getImageUrl(campaign.heroBanner.imageUrl)}
                      alt={campaign.name}
                    />
                  ) : (
                    <Box
                      sx={{
                        height: 140,
                        bgcolor: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ImageIcon sx={{ fontSize: 48, color: '#ccc' }} />
                    </Box>
                  )}
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1a1a2e' }}>
                        {campaign.name}
                      </Typography>
                      <Chip
                        label={campaign.status}
                        size="small"
                        sx={{
                          bgcolor: campaign.status === 'ACTIVE' ? '#E8F5E9' : '#FFEBEE',
                          color: campaign.status === 'ACTIVE' ? '#4CAF50' : '#F44336',
                          fontWeight: 'bold',
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      {campaign.description || 'No description'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Badge badgeContent={campaign.deals?.length || 0} color="primary">
                        <LocalOffer color="action" />
                      </Badge>
                      <Typography variant="body2" color="textSecondary">
                        {campaign.deals?.length || 0} deals
                      </Typography>
                    </Box>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Switch
                      checked={campaign.status === 'ACTIVE'}
                      onChange={() => handleToggleCampaignStatus(campaign)}
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#4CAF50' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          bgcolor: '#4CAF50',
                        },
                      }}
                    />
                    <Box>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCampaignDialog(campaign);
                        }}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCampaign(campaign._id);
                        }}
                        sx={{ color: '#F44336' }}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
        </Box>

        {/* Campaign Dialog */}
        <Dialog
          open={campaignDialogOpen}
          onClose={handleCloseCampaignDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingCampaign ? 'Edit Campaign' : 'New Campaign'}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Campaign Name *"
                  fullWidth
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={2}
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Categories</InputLabel>
                  <Select
                    multiple
                    value={selectedCampaignCategoryIds}
                    onChange={(e) =>
                      setSelectedCampaignCategoryIds(
                        typeof e.target.value === 'string'
                          ? e.target.value.split(',')
                          : (e.target.value as string[])
                      )
                    }
                    input={<OutlinedInput label="Categories" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((id) => {
                          const name = categories.find((c) => c._id === id)?.name || id;
                          return <Chip key={id} label={name} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    {categories
                      .filter((c) => c?.isActive !== false)
                      .map((c) => (
                        <MenuItem key={c._id} value={c._id}>
                          {c.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Branches</InputLabel>
                  <Select
                    multiple
                    value={campaignForm.branch || []}
                    onChange={(e) => setCampaignForm({ ...campaignForm, branch: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
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
                    {branches.map((b) => (
                      <MenuItem key={b._id} value={b._id}>
                        {b.branchName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: '#666' }}>
                  Hero Banner
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<ImageIcon />}
                    sx={{ textTransform: 'none' }}
                  >
                    Upload Banner Image
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const response: any = await uploadBase64Image(file);
                        if (response?.success && response.data?.url) {
                          setCampaignForm({ ...campaignForm, heroBannerImageUrl: response.data.url });
                        } else {
                          alert(response?.message || response?.error || 'Failed to upload image');
                        }
                        e.target.value = '';
                      }}
                    />
                  </Button>
                  {campaignForm.heroBannerImageUrl ? (
                    <Avatar
                      variant="rounded"
                      src={api.getImageUrl(campaignForm.heroBannerImageUrl)}
                      sx={{ width: 72, height: 48 }}
                    />
                  ) : null}
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Banner Title"
                  fullWidth
                  value={campaignForm.heroBannerTitle}
                  onChange={(e) =>
                    setCampaignForm({ ...campaignForm, heroBannerTitle: e.target.value })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Banner Subtitle"
                  fullWidth
                  value={campaignForm.heroBannerSubtitle}
                  onChange={(e) =>
                    setCampaignForm({ ...campaignForm, heroBannerSubtitle: e.target.value })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={campaignForm.status}
                    label="Status"
                    onChange={(e) =>
                      setCampaignForm({
                        ...campaignForm,
                        status: e.target.value as 'ACTIVE' | 'INACTIVE' | 'SCHEDULED',
                      })
                    }
                  >
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="INACTIVE">Inactive</MenuItem>
                    <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Start Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={campaignForm.startDate}
                  onChange={(e) =>
                    setCampaignForm({ ...campaignForm, startDate: e.target.value })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="End Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={campaignForm.endDate}
                  onChange={(e) => setCampaignForm({ ...campaignForm, endDate: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Display Order"
                  type="number"
                  fullWidth
                  value={campaignForm.displayOrder}
                  onChange={(e) =>
                    setCampaignForm({ ...campaignForm, displayOrder: parseInt(e.target.value) || 0 })
                  }
                  helperText="Lower numbers appear first"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCampaignDialog}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSaveCampaign}
              disabled={savingCampaign}
              sx={{ bgcolor: '#E87E35', '&:hover': { bgcolor: '#d66d2a' } }}
            >
              {savingCampaign ? 'Saving...' : editingCampaign ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // Campaign Detail View
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={handleBackToList} sx={{ bgcolor: '#f5f5f5' }}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1a1a2e' }}>
            {selectedCampaign?.name}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {selectedCampaign?.deals?.length || 0} deals
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDealDialog()}
          sx={{
            bgcolor: '#E87E35',
            '&:hover': { bgcolor: '#d66d2a' },
            textTransform: 'none',
            fontWeight: 'bold',
          }}
        >
          Add Deal
        </Button>
      </Box>

      {/* Hero Banner Preview */}
      {selectedCampaign?.heroBanner?.imageUrl && (
        <Paper
          sx={{
            mb: 3,
            borderRadius: 2,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Box
            component="img"
            src={api.getImageUrl(selectedCampaign.heroBanner.imageUrl)}
            alt="Hero Banner"
            sx={{ width: '100%', height: 200, objectFit: 'cover' }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: 'rgba(0,0,0,0.6)',
              p: 2,
            }}
          >
            <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
              {selectedCampaign.heroBanner.title || selectedCampaign.name}
            </Typography>
            {selectedCampaign.heroBanner.subtitle && (
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                {selectedCampaign.heroBanner.subtitle}
              </Typography>
            )}
          </Box>
        </Paper>
      )}

      {/* Deals Grid */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
        Deal Items
      </Typography>

      {selectedCampaign?.deals?.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <LocalOffer sx={{ fontSize: 48, color: '#ddd', mb: 1 }} />
          <Typography color="textSecondary">No deals in this campaign</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDealDialog()}
            sx={{ mt: 2, bgcolor: '#E87E35', '&:hover': { bgcolor: '#d66d2a' } }}
          >
            Add First Deal
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {selectedCampaign?.deals?.map((deal) => (
            <Grid key={deal._id} size={{ xs: 12, sm: 6, md: 6, lg: 4, xl: 3 }}>
              <Card
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: deal.isActive !== false ? 'none' : '2px solid #f5f5f5',
                  opacity: deal.isActive !== false ? 1 : 0.7,
                }}
              >
                <Box sx={{ position: 'relative' }}>
                  {deal.imageUrl ? (
                    <CardMedia
                      component="img"
                      height="160"
                      image={api.getImageUrl(deal.imageUrl)}
                      alt={deal.title}
                    />
                  ) : (
                    <Box
                      sx={{
                        height: 160,
                        bgcolor: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ImageIcon sx={{ fontSize: 48, color: '#ccc' }} />
                    </Box>
                  )}
                  {discountPercent(deal) > 0 && (
                    <Chip
                      label={`${discountPercent(deal)}% OFF`}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: '#E74C3C',
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    />
                  )}
                </Box>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {deal.title}
                  </Typography>
                  {deal.description && (
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      {deal.description}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" sx={{ color: '#E87E35', fontWeight: 'bold' }}>
                      {formatPrice(deal.price)}
                    </Typography>
                    {deal.originalPrice && deal.originalPrice > deal.price && (
                      <Typography
                        variant="body2"
                        sx={{ color: '#999', textDecoration: 'line-through' }}
                      >
                        {formatPrice(deal.originalPrice)}
                      </Typography>
                    )}
                  </Box>
                  {deal.items && deal.items.length > 0 && (
                    <Typography variant="caption" color="textSecondary">
                      Includes: {deal.items.map((i) => i.productName).join(', ')}
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Switch
                    checked={deal.isActive !== false}
                    onChange={() => handleToggleDealStatus(deal)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#4CAF50' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        bgcolor: '#4CAF50',
                      },
                    }}
                  />
                  <Box>
                    <IconButton size="small" onClick={() => handleOpenDealDialog(deal)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteDeal(deal._id)}
                      sx={{ color: '#F44336' }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Deal Dialog */}
      <Dialog open={dealDialogOpen} onClose={handleCloseDealDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingDeal ? 'Edit Deal' : 'Add Deal'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Deal Title *"
                fullWidth
                value={dealForm.title}
                onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={dealForm.description}
                onChange={(e) => setDealForm({ ...dealForm, description: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<ImageIcon />}
                  sx={{ textTransform: 'none' }}
                >
                  Upload Deal Image
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const response: any = await uploadBase64Image(file);
                      if (response?.success && response.data?.url) {
                        setDealForm({ ...dealForm, imageUrl: response.data.url });
                      } else {
                        alert(response?.message || response?.error || 'Failed to upload image');
                      }
                      e.target.value = '';
                    }}
                  />
                </Button>
                {dealForm.imageUrl ? (
                  <Avatar
                    variant="rounded"
                    src={api.getImageUrl(dealForm.imageUrl)}
                    sx={{ width: 72, height: 48 }}
                  />
                ) : null}
              </Box>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Categories</InputLabel>
                <Select
                  multiple
                  value={selectedDealCategoryIds}
                  onChange={(e) =>
                    setSelectedDealCategoryIds(
                      typeof e.target.value === 'string'
                        ? e.target.value.split(',')
                        : (e.target.value as string[])
                    )
                  }
                  input={<OutlinedInput label="Categories" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((id) => {
                        const name = categories.find((c) => c._id === id)?.name || id;
                        return <Chip key={id} label={name} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {categories
                    .filter((c) => c?.isActive !== false)
                    .map((c) => (
                      <MenuItem key={c._id} value={c._id}>
                        {c.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={`Original Price (${currencySymbol})`}
                type="number"
                fullWidth
                value={dealForm.originalPrice}
                onChange={(e) =>
                  setDealForm({ ...dealForm, originalPrice: parseFloat(e.target.value) || 0 })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={`Sale Price * (${currencySymbol})`}
                type="number"
                fullWidth
                value={dealForm.price}
                onChange={(e) =>
                  setDealForm({ ...dealForm, price: parseFloat(e.target.value) || 0 })
                }
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Display Order"
                type="number"
                fullWidth
                value={dealForm.displayOrder}
                onChange={(e) =>
                  setDealForm({ ...dealForm, displayOrder: parseInt(e.target.value) || 0 })
                }
                helperText="Lower numbers appear first"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={dealForm.isActive}
                    onChange={(e) => setDealForm({ ...dealForm, isActive: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDealDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveDeal}
            disabled={savingDeal}
            sx={{ bgcolor: '#E87E35', '&:hover': { bgcolor: '#d66d2a' } }}
          >
            {savingDeal ? 'Saving...' : editingDeal ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDealCampaigns;
