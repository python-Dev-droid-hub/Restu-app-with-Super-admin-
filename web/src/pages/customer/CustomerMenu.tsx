import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { api } from '../../services/api';

interface Branch {
  _id: string;
  branchName?: string;
  name?: string;
}

interface ProductSize {
  price: number;
  isDefault?: boolean;
}

interface Product {
  _id: string;
  name: string;
  description?: string;
  price?: number;
  displayOrder?: number;
  effectivePrice?: number;
  hasSizes?: boolean;
  productSizes?: ProductSize[];
  imageUrl?: string;
  image?: string;
  isAvailable?: boolean;
}

interface Category {
  _id: string;
  name: string;
  displayOrder?: number;
  products: Product[];
}

interface DealItem {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  isActive?: boolean;
  items?: Array<{ productId?: string; quantity?: number }>;
  isOrderable?: boolean;
  displayOrder?: number;
}

interface DealCampaign {
  _id: string;
  name: string;
  status: string;
  displayOrder?: number;
  heroBanner?: { imageUrl?: string; title?: string; subtitle?: string };
  deals?: DealItem[];
}

type CartItem = {
  productId: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
};

const getDisplayPrice = (product: Product): number => {
  if (typeof product.effectivePrice === 'number' && Number.isFinite(product.effectivePrice)) {
    return product.effectivePrice;
  }

  const sizes = product.productSizes;
  if (product.hasSizes && Array.isArray(sizes) && sizes.length > 0) {
    const defaultSize = sizes.find((s) => s?.isDefault);
    const candidate = defaultSize?.price ?? Math.min(...sizes.map((s) => s?.price ?? Number.POSITIVE_INFINITY));
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
  }

  return typeof product.price === 'number' && Number.isFinite(product.price) ? product.price : 0;
};

const getSortOrder = (value: unknown): number => {
  return Number.isFinite(Number(value)) ? Number(value) : Number.MAX_SAFE_INTEGER;
};

const compareByDisplayOrder = (a: { displayOrder?: number; name?: string; title?: string }, b: { displayOrder?: number; name?: string; title?: string }) => {
  const displayOrderDifference = getSortOrder(a?.displayOrder) - getSortOrder(b?.displayOrder);
  if (displayOrderDifference !== 0) {
    return displayOrderDifference;
  }

  return String(a?.title || a?.name || '').localeCompare(String(b?.title || b?.name || ''));
};

const readCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem('customer_cart');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCart = (items: CartItem[]) => {
  localStorage.setItem('customer_cart', JSON.stringify(items));
  window.dispatchEvent(new Event('customer_cart_updated'));
};

export default function CustomerMenu() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('selectedBranchId');
    if (stored) setSelectedBranchId(stored);
  }, []);

  useEffect(() => {
    const loadBranches = async () => {
      const res = await api.get<{ branches: Branch[] }>('/branches?limit=100');
      if (res.success && res.data?.branches) {
        setBranches(res.data.branches);
      } else {
        setBranches([]);
      }
    };
    loadBranches();
  }, []);

  useEffect(() => {
    localStorage.setItem('selectedBranchId', selectedBranchId);
    const load = async () => {
      setLoading(true);
      try {
        const menuUrl =
          selectedBranchId && selectedBranchId !== 'all' ? `/menu?branchId=${encodeURIComponent(selectedBranchId)}` : '/menu';

        const dealsUrl =
          selectedBranchId && selectedBranchId !== 'all'
            ? `/deals/campaigns/active?branch=${encodeURIComponent(selectedBranchId)}`
            : '/deals/campaigns/active';

        const [menuRes, dealsRes] = await Promise.all([api.get<any>(menuUrl), api.get<any>(dealsUrl)]);

        if (menuRes.success) {
          const nextCategories = Array.isArray(menuRes.data?.categories || menuRes.data)
            ? ((menuRes.data?.categories || menuRes.data) as Category[])
            : [];
          const sortedCategories = nextCategories
            .map((category) => ({
              ...category,
              products: Array.isArray(category?.products) ? [...category.products].sort(compareByDisplayOrder) : [],
            }))
            .sort(compareByDisplayOrder);
          setCategories(sortedCategories);
          if (!selectedCategoryId && sortedCategories.length > 0) {
            setSelectedCategoryId(String(sortedCategories[0]._id));
          }
        } else {
          setCategories([]);
        }

        if (dealsRes.success) {
          const campaigns = (dealsRes.data as any)?.campaigns;
          const activeCampaigns = Array.isArray(campaigns)
            ? campaigns
                .filter((c: DealCampaign) => c?.status === 'ACTIVE' || c?.status === undefined)
                .sort(compareByDisplayOrder)
            : [];

          const allDeals: DealItem[] = [];
          for (const campaign of activeCampaigns) {
            const list = Array.isArray(campaign?.deals) ? [...campaign.deals].sort(compareByDisplayOrder) : [];
            for (const deal of list) {
              if (deal?.isActive === false) continue;
              if (!deal?._id || !deal?.title) continue;
              const configuredItems = Array.isArray(deal?.items)
                ? deal.items.filter((item: any) => item?.productId)
                : [];
              allDeals.push({
                ...deal,
                displayOrder: Number.isFinite(Number(deal?.displayOrder)) ? Number(deal.displayOrder) : undefined,
                isOrderable: configuredItems.length > 0,
                items: configuredItems,
              });
            }
          }
          setDeals(allDeals.sort(compareByDisplayOrder));
        } else {
          setDeals([]);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedBranchId, selectedCategoryId]);

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c._id) === String(selectedCategoryId)) || categories[0],
    [categories, selectedCategoryId]
  );

  const products = selectedCategory?.products || [];

  const addToCart = (product: Product) => {
    const productId = String((product as any)._id || (product as any).id || '').trim();
    if (!productId) return;
    const price = getDisplayPrice(product);
    const image = product.imageUrl || product.image;

    const existing = readCart();
    const idx = existing.findIndex((i) => i.productId === productId);
    if (idx >= 0) {
      const next = [...existing];
      next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
      writeCart(next);
      return;
    }
    writeCart([...existing, { productId, name: product.name, price, image, quantity: 1 }]);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, color: 'var(--text-primary)' }}>
              Menu
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
              Choose items and add to cart
            </Typography>
          </Box>

          <TextField
            select
            size="small"
            label="Branch"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="all">All branches</MenuItem>
            {branches.map((b) => (
              <MenuItem key={b._id} value={b._id}>
                {b.branchName || b.name || b._id}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      {deals.length > 0 && (
        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Deals
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', pb: 1 }}>
            {deals.map((d) => {
              const img = api.getImageUrl(d.imageUrl);
              const badgeText = typeof d.discount === 'number' ? `${d.discount}% OFF` : '';
              return (
                <Paper
                  key={d._id}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)',
                    minWidth: 320,
                    display: 'flex',
                    gap: 2,
                    alignItems: 'center',
                    bgcolor: 'var(--bg-card)',
                  }}
                >
                  {img ? (
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: 2,
                        backgroundImage: `url(${img})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        border: '1px solid var(--border-color)',
                        flex: '0 0 auto',
                      }}
                    />
                  ) : null}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.25 }}>
                      <Typography sx={{ fontWeight: 900, color: 'var(--text-primary)' }} noWrap>
                        {d.title}
                      </Typography>
                      {badgeText ? (
                        <Chip
                          size="small"
                          label={badgeText}
                          sx={{ bgcolor: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 900 }}
                        />
                      ) : null}
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }} noWrap>
                      {d.description || ''}
                    </Typography>
                    {d.isOrderable === false ? (
                      <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
                        Available soon
                      </Typography>
                    ) : null}
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        </Box>
      )}

      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Categories
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
          {categories.map((c) => (
            <Chip
              key={c._id}
              label={c.name}
              clickable
              onClick={() => setSelectedCategoryId(String(c._id))}
              sx={{
                bgcolor: String(c._id) === String(selectedCategoryId) ? 'var(--primary-light)' : 'var(--bg-card)',
                border: '1px solid',
                borderColor: String(c._id) === String(selectedCategoryId) ? 'var(--primary)' : 'var(--border-color)',
                color: String(c._id) === String(selectedCategoryId) ? 'var(--primary)' : 'var(--text-primary)',
                fontWeight: 800,
              }}
            />
          ))}
        </Stack>
      </Box>

      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {selectedCategory?.name || 'Products'}
          </Typography>
        </Stack>

        <Grid container spacing={2}>
          {products.map((p) => {
            const img = api.getImageUrl(p.imageUrl || p.image);
            const price = getDisplayPrice(p);
            return (
              <Grid key={p._id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Card
                  sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)',
                    bgcolor: 'var(--bg-card)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 'var(--shadow-md)' },
                  }}
                >
                  <Box sx={{ width: '100%', height: 180, bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {img ? <Box component="img" src={img} alt={p.name} sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 1.2 }} /> : null}
                  </Box>
                  <CardContent sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 900, color: 'var(--text-primary)' }}>{p.name}</Typography>
                    {p.description ? (
                      <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5 }} noWrap>
                        {p.description}
                      </Typography>
                    ) : null}
                    <Typography sx={{ color: 'var(--primary)', fontWeight: 900, mt: 1 }}>
                      ₨{Number(price).toFixed(0)}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => addToCart(p)}
                      disabled={loading || p.isAvailable === false}
                      sx={{
                        bgcolor: 'var(--primary)',
                        transition: 'transform 0.15s ease, background 0.2s ease',
                        '&:hover': { bgcolor: 'var(--primary-hover)', transform: 'translateY(-1px)' },
                        '&:active': { transform: 'scale(0.98)' },
                      }}
                    >
                      Add to cart
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {!loading && products.length === 0 ? (
          <Paper sx={{ p: 3, mt: 2, borderRadius: 3, border: '1px solid var(--border-color)' }}>
            <Typography sx={{ color: 'var(--text-secondary)', fontWeight: 700 }}>No products found.</Typography>
          </Paper>
        ) : null}
      </Box>
    </Box>
  );
}
