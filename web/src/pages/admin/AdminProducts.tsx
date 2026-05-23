import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Rating,
  Skeleton,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Switch,
  FormControlLabel,
  InputLabel,
} from '@mui/material';
import {
  Add,
  Search,
  Edit,
  Visibility,
  MoreVert,
  Close,
} from '@mui/icons-material';
import { api } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { useManagerBranchScope } from '../../utils/managerBranchScope';

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  image?: string;
  rating?: number;
  reviews?: number;
  category?: string;
  categoryName?: string;
  branchName?: string;
  isAvailable?: boolean;
  isActive?: boolean;
  isActivatedForBranch?: boolean;
  branchActivationId?: string | null;
  tags?: string[];
  hasSizes?: boolean;
  sizes?: any[];
  branchId?: string | string[];
  categoryId?: string;
}

interface AdminProductsProps {
  pageTitle?: string;
}

const AdminProducts: React.FC<AdminProductsProps> = ({ pageTitle = 'Products' }) => {
  const { currencySymbol, formatPrice } = useSettings();
  const { isBranchManager, assignedBranchId, hideBranchFilter } = useManagerBranchScope();
  const isMenuPage = pageTitle === 'Menu';
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [selectedBranchId, setSelectedBranchId] = useState('all');
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [activationUpdating, setActivationUpdating] = useState<Record<string, boolean>>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    categoryId: '',
    branchId: [] as string[],
    isAvailable: true,
    isActive: true,
    image: '',
  });
  const itemsPerPage = 20;

  useEffect(() => {
    if (isBranchManager && assignedBranchId) {
      setSelectedBranchId(assignedBranchId);
    }
  }, [isBranchManager, assignedBranchId]);

  useEffect(() => {
    loadProducts();
    loadCategories();
    if (!hideBranchFilter) {
      loadBranches();
    }
  }, [selectedBranchId, isMenuPage, hideBranchFilter]);

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

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, selectedCategoryId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      if (isMenuPage && selectedBranchId === 'all') {
        setProducts([]);
        return;
      }
      const response: any = await api.getAdminProducts({
        limit: isMenuPage ? 1000 : 100,
        activationBranchId: selectedBranchId !== 'all' ? selectedBranchId : undefined,
        onlyActivated: isMenuPage ? true : undefined,
      });
      console.log('[Products] API Response:', response);
      if (response?.success && response?.data) {
        const rawProducts = response.data.products || response.data.data?.products || response.data.data || response.data;
        console.log('[Products] Raw products:', rawProducts);
        const normalized = (Array.isArray(rawProducts) ? rawProducts : []).map((p: any) => {
          // Handle Mongoose document structure - data may be under _doc
          const doc = p?._doc || p;
          // Product model uses 'imageUrl' not 'image'
          let imageData = doc?.imageUrl || p?.imageUrl || doc?.image || p?.image || doc?.images?.[0] || p?.images?.[0] || '';
          
          // Filter out invalid paths (mobile app paths, file:// URLs)
          if (imageData && (imageData.startsWith('file://') || imageData.includes('var/mobile') || imageData.includes('ImagePicker'))) {
            imageData = '';
          }
          
          if (p === rawProducts[0]) {
            console.log('[Products] First product doc:', doc);
            console.log('[Products] First product imageUrl:', imageData);
          }
          
          return {
            _id: p?._id || p?.id || doc?._id,
            name: doc?.name || p?.name || 'Unnamed Product',
            description: doc?.description || p?.description,
            price: Number(doc?.price || p?.price || 0),
            originalPrice: doc?.originalPrice || p?.originalPrice ? Number(doc?.originalPrice || p?.originalPrice) : undefined,
            image: imageData,
            rating: doc?.rating || p?.rating || 4,
            reviews: doc?.reviews || p?.reviews || 50,
            // Extract categoryId from populated category object or raw category field
            categoryId: doc?.category?._id || doc?.category || p?.category?._id || p?.category || '',
            category: typeof doc?.category === 'string' ? doc.category.toLowerCase() : 
                      typeof p?.category === 'string' ? p.category.toLowerCase() : 
                      doc?.category?.name?.toLowerCase() || p?.category?.name?.toLowerCase() || 
                      doc?.categoryName?.toLowerCase() || p?.categoryName?.toLowerCase() || 'uncategorized',
            categoryName: doc?.category?.name || p?.category?.name || doc?.categoryName || p?.categoryName || 'Uncategorized',
            branchName: doc?.branch?.branchName || doc?.branch?.name || p?.branch?.branchName || p?.branch?.name || doc?.branchName || p?.branchName || 'Unknown Branch',
            isAvailable: doc?.isAvailable ?? p?.isAvailable ?? true,
            isActive: doc?.isActive ?? p?.isActive ?? true,
            isActivatedForBranch: doc?.isActivatedForBranch ?? p?.isActivatedForBranch ?? undefined,
            branchActivationId: doc?.branchActivationId ?? p?.branchActivationId ?? null,
            tags: doc?.tags || p?.tags || [],
          };
        });
        console.log('[Products] Normalized products:', normalized);
        setProducts(normalized);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActivationForBranch = async (productId: string) => {
    if (selectedBranchId === 'all') {
      return;
    }
    try {
      setActivationUpdating((prev) => ({ ...prev, [productId]: true }));
      const response: any = await api.post(`/menu/admin/products/${productId}/toggle-activation`, {
        branchId: selectedBranchId,
      });
      if (response?.success) {
        await loadProducts();
      }
    } catch (error) {
      console.error('Error toggling activation:', error);
    } finally {
      setActivationUpdating((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const loadCategories = async () => {
    try {
      const response: any = await api.getAllCategories();
      if (response?.success) {
        const cats = response.data?.categories || response.data || [];
        setCategories(Array.isArray(cats) ? cats : []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (selectedCategoryId !== 'all') {
      filtered = filtered.filter((product) => product.categoryId === selectedCategoryId);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(query) ||
        p.categoryName?.toLowerCase().includes(query) ||
        p.branchName?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
    setPage(1);
  };

  const getDiscount = (price: number, originalPrice?: number): number => {
    if (!originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  };

  const handleOpenAddDialog = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      originalPrice: '',
      categoryId: '',
      branchId: [] as string[],
      isAvailable: true,
      isActive: true,
      image: '',
    });
    setDialogError('');
    setEditDialogOpen(true);
  };

  const handleOpenEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      originalPrice: String(product.originalPrice || ''),
      categoryId: product.categoryId || '',
      branchId: Array.isArray(product.branchId) ? product.branchId : (product.branchId ? [product.branchId] : []),
      isAvailable: product.isAvailable ?? true,
      isActive: product.isActive ?? true,
      image: product.image || '',
    });
    setDialogError('');
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingProduct(null);
    setDialogError('');
  };

  const handleSaveProduct = async () => {
    if (!formData.name.trim()) {
      setDialogError('Product name is required');
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setDialogError('Valid price is required');
      return;
    }
    if (!formData.categoryId) {
      setDialogError('Category is required');
      return;
    }

    try {
      setSaving(true);
      setDialogError('');
      
      const updateData: any = {
        name: formData.name,
        price: parseFloat(formData.price),
        isAvailable: formData.isAvailable,
      };
      if (formData.description !== undefined) {
        updateData.description = formData.description.trim();
      }
      
      if (formData.categoryId) {
        updateData.category = formData.categoryId;
      }
      if (formData.branchId && formData.branchId.length > 0) {
        updateData.branchId = formData.branchId;
      }
      if (formData.image) {
        updateData.imageUrl = formData.image;
      }

      if (editingProduct) {
        const response: any = await api.updateProduct(editingProduct._id, updateData);
        if (!response?.success) {
          throw new Error(response?.error || response?.message || 'Failed to update product');
        }
      } else {
        // Create new product
        const response: any = await api.post('/menu/admin/products', updateData);
        if (!response?.success) {
          throw new Error(response?.error || response?.message || 'Failed to create product');
        }
      }
      
      handleCloseEditDialog();
      loadProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      setDialogError(error.response?.data?.message || error.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const response: any = await api.uploadImage(base64, file.name);
        if (response?.success && response?.data?.url) {
          setFormData((prev) => ({ ...prev, image: response.data.url }));
        } else {
          setDialogError(response?.error || response?.message || 'Failed to upload image');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const paginatedProducts = filteredProducts.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, pb: { xs: 2, md: 3 }, pt: 0, bgcolor: '#f8f5ff', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>
          {pageTitle}
        </Typography>
        {!isMenuPage && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenAddDialog}
            sx={{
              bgcolor: '#FF6B35',
              '&:hover': { bgcolor: '#E55A24' },
              borderRadius: 2,
              textTransform: 'none',
            }}
          >
            Add Product
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            flex: 1,
            minWidth: { xs: '100%', sm: 200 },
            maxWidth: { xs: '100%', sm: 300 },
            bgcolor: 'white',
            borderRadius: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '& fieldset': { border: 'none' },
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Search sx={{ color: '#999', fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
        />
        <FormControl
          size="small"
          sx={{
            minWidth: 220,
            bgcolor: 'white',
            borderRadius: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '& fieldset': { border: 'none' },
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            },
          }}
        >
          <InputLabel id="product-category-filter-label">Category</InputLabel>
          <Select
            labelId="product-category-filter-label"
            value={selectedCategoryId}
            label="Category"
            onChange={(e) => setSelectedCategoryId(e.target.value)}
          >
            <MenuItem value="all">All Categories</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category._id} value={category._id}>
                {category.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {!hideBranchFilter ? (
          <FormControl
            size="small"
            sx={{
              minWidth: 220,
              bgcolor: 'white',
              borderRadius: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '& fieldset': { border: 'none' },
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              },
            }}
          >
            <InputLabel id="product-branch-filter-label">Branch</InputLabel>
            <Select
              labelId="product-branch-filter-label"
              value={selectedBranchId}
              label="Branch"
              onChange={(e) => setSelectedBranchId(e.target.value)}
            >
              <MenuItem value="all">{isMenuPage ? 'Select Branch' : 'All Branches'}</MenuItem>
              {branches.map((branch) => (
                <MenuItem key={branch._id} value={branch._id}>
                  {branch.branchName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}
      </Box>

      {loading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
          {[...Array(6)].map((_, i) => (
            <Card key={i} sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Skeleton variant="rectangular" height={140} />
              <CardContent>
                <Skeleton height={24} width="60%" />
                <Skeleton height={20} width="40%" />
                <Skeleton height={20} width="80%" />
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : paginatedProducts.length > 0 ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
          {paginatedProducts.map((product) => {
            const discount = getDiscount(product.price, product.originalPrice);
            return (
              <Card
                key={product._id}
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  },
                }}
              >
                <Box sx={{ position: 'relative' }}>
                  <CardMedia
                    component="img"
                    height="140"
                    image={product.image ? api.getImageUrl(product.image) : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='}
                    alt={product.name}
                    sx={{ objectFit: 'cover', bgcolor: '#f5f5f5' }}
                  />
                  {discount > 0 && (
                    <Chip
                      label={`-${discount}%`}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        bgcolor: '#FF6B35',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: 11,
                      }}
                    />
                  )}
                  <IconButton
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'rgba(255,255,255,0.9)',
                      '&:hover': { bgcolor: 'white' },
                    }}
                  >
                    <MoreVert sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
                
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 16, color: '#333', mb: 0.5 }}>
                        {product.name}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#999', mb: 1 }}>
                        {product.branchName}
                      </Typography>
                    </Box>
                    <Rating
                      value={product.rating || 0}
                      readOnly
                      size="small"
                      sx={{ color: '#FFC107' }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip
                      label={product.categoryName}
                      size="small"
                      sx={{
                        bgcolor: '#FFE8E0',
                        color: '#FF6B35',
                        fontSize: 11,
                        fontWeight: 500,
                        height: 24,
                      }}
                    />
                    <Chip
                      icon={<span style={{ fontSize: 10 }}>✓</span>}
                      label="View"
                      size="small"
                      sx={{
                        bgcolor: '#E8F5E9',
                        color: '#4CAF50',
                        fontSize: 11,
                        fontWeight: 500,
                        height: 24,
                      }}
                    />
                  </Box>

                  {!isMenuPage && selectedBranchId !== 'all' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Chip
                        label={product.isActivatedForBranch ? '✓ Activated' : '○ Not Activated'}
                        size="small"
                        sx={{
                          bgcolor: product.isActivatedForBranch ? '#E8F5E9' : '#FFF3E0',
                          color: product.isActivatedForBranch ? '#2E7D32' : '#EF6C00',
                          fontSize: 11,
                          fontWeight: 500,
                          height: 24,
                        }}
                      />
                      <Switch
                        checked={!!product.isActivatedForBranch}
                        onChange={() => toggleActivationForBranch(product._id)}
                        disabled={!!activationUpdating[product._id]}
                        color="success"
                      />
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontWeight: 'bold', fontSize: 18, color: '#FF6B35' }}>
                        {formatPrice(product.price)}
                      </Typography>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <Typography sx={{ fontSize: 14, color: '#999', textDecoration: 'line-through' }}>
                          {formatPrice(product.originalPrice)}
                        </Typography>
                      )}
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEditDialog(product)}
                        sx={{
                          color: '#666',
                          '&:hover': { color: '#FF6B35', bgcolor: '#FFE8E0' },
                        }}
                      >
                        <Edit sx={{ fontSize: 18 }} />
                      </IconButton>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Visibility sx={{ fontSize: 16 }} />}
                        sx={{
                          bgcolor: '#FF6B35',
                          '&:hover': { bgcolor: '#E55A24' },
                          textTransform: 'none',
                          borderRadius: 2,
                          px: 2,
                        }}
                      >
                        View
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="#999" sx={{ fontSize: 16 }}>
            {isMenuPage && selectedBranchId === 'all'
              ? isBranchManager && !assignedBranchId
                ? 'No branch assigned to your account. Ask an admin to assign a branch.'
                : 'Select a branch to view its menu products'
              : isMenuPage
                ? 'No menu products found for the selected branch'
                : 'No products found'}
          </Typography>
        </Box>
      )}

      {!loading && filteredProducts.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            sx={{
              '& .MuiPaginationItem-root': {
                color: '#666',
                '&.Mui-selected': {
                  bgcolor: '#FF6B35',
                  color: 'white',
                },
              },
            }}
          />
        </Box>
      )}

      {/* Edit Product Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingProduct ? 'Edit Product' : 'Add Product'}
          <IconButton onClick={handleCloseEditDialog} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          
          <TextField
            autoFocus
            margin="dense"
            label="Product Name"
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
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <TextField
              margin="dense"
              label={`Price (${currencySymbol})`}
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
              sx={{ flex: 1 }}
            />
            <TextField
              margin="dense"
              label={`Original Price (${currencySymbol})`}
              type="number"
              value={formData.originalPrice}
              onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
              sx={{ flex: 1 }}
            />
          </Box>

          <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
            <InputLabel id="category-select-label">Category</InputLabel>
            <Select
              labelId="category-select-label"
              value={formData.categoryId}
              label="Category"
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              required
            >
              {categories.map((cat) => (
                <MenuItem key={cat._id} value={cat._id}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
            <InputLabel id="branch-select-label">Branches</InputLabel>
            <Select
              labelId="branch-select-label"
              multiple
              value={formData.branchId || []}
              label="Branches"
              onChange={(e) => setFormData({ ...formData, branchId: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
            >
              {branches.map((branch) => (
                <MenuItem key={branch._id} value={branch._id}>
                  {branch.branchName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Product Image</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {formData.image && (
                <Box
                  component="img"
                  src={api.getImageUrl(formData.image)}
                  sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1 }}
                />
              )}
              <Button variant="outlined" component="label" size="small">
                Upload Image
                <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
              </Button>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <FormControlLabel
              control={<Switch checked={formData.isAvailable} onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })} />}
              label="Available"
            />
            <FormControlLabel
              control={<Switch checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />}
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button onClick={handleSaveProduct} variant="contained" disabled={saving} sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#E55A24' } }}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminProducts;
