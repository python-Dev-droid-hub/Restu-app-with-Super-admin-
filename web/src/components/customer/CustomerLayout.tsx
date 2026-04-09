import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  AppBar,
  Badge,
  Box,
  Button,
  Stack,
  Divider,
  Container,
  DialogActions,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Toolbar,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  FormControl,
  Grid,
  TextField,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  AccountBalance,
  Apartment,
  Castle,
  Factory,
  Mosque,
  Sailing,
  TempleBuddhist,
  LocationOn,
  Phone,
  Add,
  Remove,
  Delete,
  ShoppingBag,
  ShoppingCart,
  ArrowForward,
  Close,
  CheckCircle,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import Footer from '../footer/Footer';

type Branch = {
  _id: string;
  branchName?: string;
  branchCode?: string;
  name?: string;
  city?: string;
  addressLine?: string;
  lat?: number;
  lng?: number;
  location?: { latitude?: number; longitude?: number };
};

type CartItem = {
  productId: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  specialInstructions?: string;
  cartKey: string;
};

type SuggestedItem = {
  id: string;
  name: string;
  price: number;
  image?: string;
};

const extractImagePath = (raw: any): string => {
  if (!raw) return '';
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('data:image') || trimmed.startsWith('blob:') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
      return trimmed;
    }
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        return extractImagePath(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const found = extractImagePath(item);
      if (found) return found;
    }
    return '';
  }
  if (typeof raw === 'object') {
    return (
      extractImagePath(raw.imageUrl) ||
      extractImagePath(raw.image) ||
      extractImagePath(raw.url) ||
      extractImagePath(raw.src) ||
      extractImagePath(raw.path) ||
      ''
    );
  }
  return '';
};

const extractCartArray = (parsed: any): any[] => {
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== 'object') return [];
  const nestedCandidates = [
    parsed?.items,
    parsed?.cartItems,
    parsed?.cart,
    parsed?.data?.items,
    parsed?.data?.cartItems,
    parsed?.data?.cart,
  ];
  for (const candidate of nestedCandidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  const values = Object.values(parsed);
  if (values.length > 0 && values.every((v) => v && typeof v === 'object')) {
    return values as any[];
  }
  return [];
};

const normalizeCartItems = (parsed: any): CartItem[] => {
  const items = extractCartArray(parsed);
  const aggregated = new Map<string, CartItem>();
  for (const item of items) {
    const productId = String(item?.productId || item?.id || item?._id || item?.menuItemId || item?.product?._id || item?.product?.id || '').trim();
    const specialInstructions = String(item?.specialInstructions || item?.note || '').trim();
    const quantity = Number(item?.quantity ?? item?.qty ?? item?.count ?? item?.itemQty ?? item?.productQuantity ?? item?.product?.quantity ?? 1);
    if (!quantity || quantity <= 0) continue;
    const fallbackKey = String(item?.name || item?.title || item?.productName || item?.product?.name || 'item').trim().toLowerCase();
    const cartKey = `${productId || fallbackKey}::${specialInstructions}`;
    const existing = aggregated.get(cartKey);
    if (existing) {
      existing.quantity = Number(existing.quantity || 0) + quantity;
      continue;
    }
    const fallbackPrice = Number(item?.totalPrice ?? item?.lineTotal ?? 0);
    const derivedUnitPrice = fallbackPrice > 0 && quantity > 0 ? fallbackPrice / quantity : 0;
    aggregated.set(cartKey, {
      productId: productId || fallbackKey,
      name: String(item?.name || item?.title || item?.productName || item?.product?.name || 'Item'),
      price: Number(item?.price ?? item?.unitPrice ?? item?.amount ?? item?.product?.price ?? derivedUnitPrice ?? 0),
      image: item?.image || item?.imageUrl || item?.thumbnail || item?.product?.image || item?.product?.imageUrl,
      quantity,
      specialInstructions: specialInstructions || undefined,
      cartKey,
    });
  }
  return Array.from(aggregated.values());
};

const toStoredCartItems = (items: CartItem[]) => {
  return items.map((item) => {
    const next = { ...item } as any;
    delete next.cartKey;
    return next;
  });
};

const readNormalizedCartFromStorage = () => {
  try {
    const raw = localStorage.getItem('customer_cart');
    const parsed = raw ? JSON.parse(raw) : [];
    const normalized = normalizeCartItems(parsed);
    if (!Array.isArray(parsed) && normalized.length > 0) {
      localStorage.setItem('customer_cart', JSON.stringify(toStoredCartItems(normalized)));
    }
    const count = normalized.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
    return { normalized, count };
  } catch {
    return { normalized: [] as CartItem[], count: 0 };
  }
};

const PHONE_NUMBER = '03044996996';

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getCityLandmarkIcon = (cityName: string) => {
  const city = cityName.trim().toLowerCase();
  if (city.includes('lahore')) return AccountBalance;
  if (city.includes('karachi')) return Sailing;
  if (city.includes('islamabad')) return Mosque;
  if (city.includes('rawalpindi')) return Castle;
  if (city.includes('faisalabad')) return Factory;
  if (city.includes('multan')) return TempleBuddhist;
  return Apartment;
};

function LocationSelectorDialog({
  open,
  onClose,
  selectedBranchId,
  requireSelection,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  selectedBranchId: string | null;
  requireSelection: boolean;
  onSelect: (branch: Branch) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(selectedBranchId);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);

  useEffect(() => {
    setSelectedId(selectedBranchId);
    setBranchDropdownOpen(false);
  }, [selectedBranchId, open]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      try {
        const res: any = await api.getAllBranches();
        const raw = res?.data?.branches || res?.data?.data?.branches || res?.data || [];
        if (!mounted) return;
        const normalized: Branch[] = (Array.isArray(raw) ? raw : []).map((b: any) => ({
          _id: String(b?._id || b?.id || ''),
          branchName: b?.branchName || b?.name || b?.restaurantName,
          branchCode: b?.branchCode,
          name: b?.name || b?.branchName,
          city: b?.city || b?.location?.city,
          addressLine: b?.addressLine || b?.address || b?.location?.address,
          lat: typeof b?.lat === 'number' ? b.lat : b?.location?.latitude,
          lng: typeof b?.lng === 'number' ? b.lng : b?.location?.longitude,
          location: b?.location,
        })).filter((b) => b._id);
        setBranches(normalized);
        const matched = selectedBranchId ? normalized.find((item) => item._id === selectedBranchId) : null;
        if (matched?.city) {
          setSelectedCity(matched.city);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (open) run();
    return () => {
      mounted = false;
    };
  }, [open, selectedBranchId]);

  const cities = useMemo(() => {
    const values = Array.from(new Set(branches.map((b) => String(b.city || '').trim()).filter(Boolean)));
    return values.sort((a, b) => a.localeCompare(b));
  }, [branches]);

  const cityBranches = useMemo(() => {
    if (!selectedCity) return [];
    return branches.filter((b) => String(b.city || '').trim() === selectedCity);
  }, [branches, selectedCity]);

  const selectedBranch = useMemo(() => {
    if (!selectedId) return null;
    return branches.find((b) => b._id === selectedId) || null;
  }, [branches, selectedId]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        let nearest: Branch | null = null;
        let minDistance = Infinity;
        for (const b of branches) {
          const lat = typeof b.lat === 'number' ? b.lat : b.location?.latitude;
          const lng = typeof b.lng === 'number' ? b.lng : b.location?.longitude;
          if (typeof lat !== 'number' || typeof lng !== 'number') continue;
          const distance = haversineKm(latitude, longitude, lat, lng);
          if (distance < minDistance) {
            minDistance = distance;
            nearest = b;
          }
        }
        if (nearest) {
          setSelectedId(nearest._id);
          setSelectedCity(String(nearest.city || ''));
          setBranchDropdownOpen(false);
        }
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
  };

  return (
    <Dialog
      open={open}
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        },
      }}
      onClose={(_, reason) => {
        if (requireSelection && (reason === 'backdropClick' || reason === 'escapeKeyDown')) return;
        onClose();
      }}
      disableEscapeKeyDown={requireSelection}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pb: 1,
          pt: 2,
          position: 'relative',
        }}
      >
        <Typography component="span" variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
          Please select your location
        </Typography>
        {!requireSelection ? (
          <IconButton onClick={onClose} size="small" sx={{ position: 'absolute', right: 12, top: 12 }}>
            <Close />
          </IconButton>
        ) : null}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Button
            variant="contained"
            onClick={handleUseCurrentLocation}
            fullWidth
            sx={{
              width: '100%',
              maxWidth: 420,
              minWidth: 0,
              bgcolor: 'var(--primary)',
              borderRadius: 2,
              py: 1,
              px: 2,
              textTransform: 'none',
              fontWeight: 800,
              boxShadow: 'var(--shadow-sm)',
              '&:hover': { bgcolor: 'var(--primary-hover)' },
            }}
            startIcon={<LocationOn />}
          >
            Use Current Location
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              {cities.map((city) => {
                const isSelected = selectedCity === city;
                const CityIcon = getCityLandmarkIcon(city);
                return (
                  <Grid key={city} size={{ xs: 6, sm: 4, md: 3 }}>
                    <Paper
                      onClick={() => {
                        setSelectedCity(city);
                        setSelectedId(null);
                        setBranchDropdownOpen(true);
                      }}
                      sx={{
                        p: 1.25,
                        textAlign: 'center',
                        cursor: 'pointer',
                        borderRadius: 2,
                        border: isSelected ? '2px solid var(--primary)' : '1px solid #e8e8e8',
                        boxShadow: 'none',
                        bgcolor: '#fff',
                        transition: 'border-color .2s ease, transform .1s ease',
                        '&:hover': { borderColor: 'var(--primary)' },
                      }}
                    >
                      <Box
                        sx={{
                          width: 66,
                          height: 66,
                          mx: 'auto',
                          mb: 1,
                          borderRadius: 2,
                          border: isSelected ? '1px solid var(--primary)' : '1px solid #ddd',
                          color: '#7a7a7a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CityIcon sx={{ fontSize: 34 }} />
                      </Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 15, color: isSelected ? 'var(--primary)' : '#222' }}>
                        {city}
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>

            <FormControl fullWidth sx={{ mb: 1 }}>
              <Select
                displayEmpty
                value={selectedBranch?._id || ''}
                open={branchDropdownOpen}
                onOpen={() => {
                  if (selectedCity) setBranchDropdownOpen(true);
                }}
                onClose={() => setBranchDropdownOpen(false)}
                onChange={(e) => setSelectedId(String(e.target.value || ''))}
                IconComponent={branchDropdownOpen ? ExpandLess : ExpandMore}
                renderValue={(value) => {
                  if (!value) return 'Please select your location';
                  return selectedBranch?.branchName || selectedBranch?.name || 'Please select your location';
                }}
                sx={{
                  borderRadius: 2,
                  '& .MuiSelect-select': {
                    py: 1.4,
                    color: selectedBranch ? 'var(--text-primary)' : '#999',
                    fontWeight: selectedBranch ? 600 : 500,
                  },
                }}
              >
                {cityBranches.length === 0 ? (
                  <MenuItem value="" disabled>
                    No branches available
                  </MenuItem>
                ) : (
                  cityBranches.map((branch) => (
                    <MenuItem key={branch._id} value={branch._id}>
                      {branch.branchName || branch.name || 'Branch'}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
        {!requireSelection ? (
          <Button onClick={onClose} sx={{ textTransform: 'none', color: 'var(--text-secondary)', fontWeight: 700 }}>
            Cancel
          </Button>
        ) : null}
        <Button
          variant="contained"
          fullWidth
          disabled={!selectedCity || !selectedId}
          onClick={() => {
            const branch = branches.find((b) => b._id === selectedId);
            if (branch) onSelect(branch);
            onClose();
          }}
          sx={{
            bgcolor: 'var(--primary)',
            color: '#fff',
            borderRadius: 2,
            py: 1.1,
            fontSize: 16,
            fontWeight: 700,
            textTransform: 'none',
            boxShadow: 'var(--shadow-sm)',
            '&:hover': { bgcolor: 'var(--primary-hover)' },
            '&.Mui-disabled': { bgcolor: '#e9e9e9', color: '#fff' },
          }}
        >
          Select
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [taxRate, setTaxRate] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [suggestedItems, setSuggestedItems] = useState<SuggestedItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [checkoutAltPhone, setCheckoutAltPhone] = useState('');
  const [checkoutAddress, setCheckoutAddress] = useState('');
  const [checkoutLandmark, setCheckoutLandmark] = useState('');
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const saved = localStorage.getItem('selectedBranchId');
      setSelectedBranchId(saved || null);
      if (!saved) {
        setLocationDialogOpen(true);
        return;
      }
      const res: any = await api.getAllBranches();
      if (!mounted) return;
      const raw = res?.data?.branches || res?.data?.data?.branches || res?.data || [];
      const list: Branch[] = (Array.isArray(raw) ? raw : []).map((b: any) => ({
        _id: String(b?._id || b?.id || ''),
        branchName: b?.branchName || b?.name || b?.restaurantName,
        name: b?.name || b?.branchName,
        city: b?.city || b?.location?.city,
        addressLine: b?.addressLine || b?.address || b?.location?.address,
      }));
      const match = list.find((b) => b._id === saved) || null;
      setSelectedBranch(match);
      if (!match) setLocationDialogOpen(true);
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const openCart = () => {
      const { normalized, count } = readNormalizedCartFromStorage();
      setCartCount(count);
      setCartItems(normalized);
      setCartOpen(true);
    };
    window.addEventListener('open_mini_cart', openCart as EventListener);
    return () => {
      window.removeEventListener('open_mini_cart', openCart as EventListener);
    };
  }, []);

  useEffect(() => {
    const onBranchChange = () => {
      const saved = localStorage.getItem('selectedBranchId');
      setSelectedBranchId(saved || null);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'selectedBranchId') onBranchChange();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('selected_branch_changed', onBranchChange as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('selected_branch_changed', onBranchChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const update = () => {
      const { normalized, count } = readNormalizedCartFromStorage();
      setCartCount(count);
      setCartItems(normalized);
    };
    update();

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'customer_cart') update();
    };
    const onCustom = () => update();

    window.addEventListener('storage', onStorage);
    window.addEventListener('customer_cart_updated', onCustom as EventListener);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('customer_cart_updated', onCustom as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!cartOpen) return;
    const { normalized, count } = readNormalizedCartFromStorage();
    setCartCount(count);
    setCartItems(normalized);
  }, [cartOpen]);

  const visibleCartItems = useMemo(() => {
    if (cartItems.length > 0) return cartItems;
    try {
      const raw = localStorage.getItem('customer_cart');
      if (!raw) return [];
      return normalizeCartItems(JSON.parse(raw));
    } catch {
      return [];
    }
  }, [cartItems]);

  useEffect(() => {
    const loadBranchCharges = async () => {
      if (!selectedBranchId) return;
      try {
        const res: any = await api.get(`/restaurants/${selectedBranchId}`);
        const data = res?.data || {};
        setTaxRate(Number(data?.taxRate || 0));
        setDeliveryFee(Number(data?.deliveryFee || 0));
      } catch {
        setTaxRate(0);
        setDeliveryFee(0);
      }
    };
    loadBranchCharges();
  }, [selectedBranchId]);

  useEffect(() => {
    const loadSuggestions = async () => {
      if (!cartOpen || visibleCartItems.length === 0) return;
      try {
        const hasBranch = selectedBranchId && selectedBranchId !== 'all';
        const menuUrl = hasBranch ? `/menu?branchId=${encodeURIComponent(selectedBranchId)}` : '/menu';
        const menuRes: any = await api.get(menuUrl);
        const categories = menuRes?.data?.categories || menuRes?.data?.data?.categories || [];
        const cartIds = new Set(visibleCartItems.map((i) => i.productId));
        const products: SuggestedItem[] = (Array.isArray(categories) ? categories : [])
          .flatMap((cat: any) => {
            const list = Array.isArray(cat?.products) ? cat.products : (Array.isArray(cat?.items) ? cat.items : []);
            return list.map((p: any) => ({
              id: String(p?._id || p?.id || ''),
              name: String(p?.name || 'Item'),
              price: Number(p?.price || 0),
              image: extractImagePath([p?.images, p?.imageUrl, p?.image, p?.thumbnail, p?.media]),
              isAvailable: p?.isAvailable !== false,
            }));
          })
          .filter((p: any) => p.id && p.isAvailable && !cartIds.has(p.id))
          .slice(0, 6);
        setSuggestedItems(products);
      } catch {
        setSuggestedItems([]);
      }
    };
    loadSuggestions();
  }, [cartOpen, visibleCartItems, selectedBranchId]);

  const writeCart = (items: CartItem[]) => {
    const normalized = toStoredCartItems(items);
    localStorage.setItem('customer_cart', JSON.stringify(normalized));
    setCartItems(normalizeCartItems(normalized));
    window.dispatchEvent(new Event('customer_cart_updated'));
  };

  const changeQty = (cartKey: string, delta: number) => {
    const next = visibleCartItems
      .map((i) => (i.cartKey === cartKey ? { ...i, quantity: Math.max(0, (Number(i.quantity) || 0) + delta) } : i))
      .filter((i) => (Number(i.quantity) || 0) > 0);
    writeCart(next);
  };

  const removeItem = (cartKey: string) => {
    writeCart(visibleCartItems.filter((i) => i.cartKey !== cartKey));
  };

  const clearCart = () => writeCart([]);

  const cartSubtotal = visibleCartItems.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
  const taxAmount = (cartSubtotal * Number(taxRate || 0)) / 100;
  const grandTotal = cartSubtotal + taxAmount + Number(deliveryFee || 0);

  const addSuggestedToCart = (item: SuggestedItem) => {
    const idx = visibleCartItems.findIndex((i) => i.productId === item.id && !i.specialInstructions);
    if (idx >= 0) {
      const next = [...visibleCartItems];
      next[idx] = { ...next[idx], quantity: Number(next[idx].quantity || 0) + 1 };
      writeCart(next);
      return;
    }
    writeCart([
      ...visibleCartItems,
      {
        productId: item.id,
        name: item.name,
        price: Number(item.price || 0),
        image: item.image,
        quantity: 1,
        cartKey: `${item.id}::`,
      },
    ]);
  };

  const handleLocationClick = () => {
    setLocationDialogOpen(true);
  };

  const handleContactClick = () => {
    window.location.href = `tel:${PHONE_NUMBER}`;
  };

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch);
    setSelectedBranchId(branch._id);
    localStorage.setItem('selectedBranchId', branch._id);
    window.dispatchEvent(new Event('selected_branch_changed'));
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F9F9F9' }}>
      {/* Header */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: 'rgba(255,255,255,0.96)',
          color: '#333',
          borderBottom: '1px solid rgba(120,120,160,0.12)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 8px 24px rgba(18,22,58,0.08)',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ pt: 1.2, pb: 0.6, px: { xs: 0, sm: 2 } }}>
            <Box
              sx={{
                width: '100%',
                borderRadius: 999,
                px: { xs: 1.2, sm: 2.2 },
                py: 0.6,
                textAlign: 'center',
                fontWeight: 900,
                fontSize: { xs: 12, sm: 20 },
                color: '#fff',
                background: 'linear-gradient(90deg, #ffc36d 0%, #f78a53 28%, #b86bff 100%)',
                boxShadow: '0 6px 18px rgba(187,104,255,0.35)',
                border: '1px solid rgba(255,255,255,0.55)',
                letterSpacing: 0.2,
              }}
            >
              🌧️ Rain Alert: Delivery may be delayed &nbsp; | &nbsp; 🔥 20% OFF on Burgers
            </Box>
          </Box>
          <Toolbar sx={{ gap: { xs: 1, sm: 1.6 }, px: { xs: 0, sm: 2 }, py: 0.9, minHeight: 74 }}>
            {/* Logo */}
            <Box
              onClick={() => navigate('/customer')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                mr: 3,
                cursor: 'pointer',
                transition: 'transform 0.2s ease, opacity 0.2s ease',
                '&:hover': { transform: 'translateY(-1px)', opacity: 0.92 },
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: 'var(--primary)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: 20,
                  transition: 'transform 0.2s ease',
                }}
              >
                E
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 18, lineHeight: 1.2 }}
                >
                  eatzilla
                </Typography>
              </Box>
            </Box>

            {/* Change Location Button */}
            <Paper
              onClick={handleLocationClick}
              sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                gap: 1,
                px: 2.2,
                py: 0.8,
                borderRadius: 999,
                border: '1px solid rgba(142,152,205,0.3)',
                cursor: 'pointer',
                bgcolor: 'rgba(236,240,255,0.74)',
                backdropFilter: 'blur(5px)',
                '&:hover': { borderColor: '#9eaaf9', bgcolor: 'rgba(239,243,255,0.95)' },
                transition: 'all 0.2s',
                mr: 1,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
              }}
            >
              <LocationOn sx={{ color: 'var(--primary)', fontSize: 20 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#2f344a', fontSize: 12 }}>
                  {selectedBranch ? `${selectedBranch.city || ''} ${selectedBranch.branchName || selectedBranch.name || ''}`.trim() : 'Select Branch'}
                </Typography>
              </Box>
            </Paper>

            {/* Contact Us Button */}
            <Paper
              onClick={handleContactClick}
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                gap: 1,
                px: 2.2,
                py: 0.8,
                borderRadius: 999,
                border: '1px solid rgba(142,152,205,0.3)',
                cursor: 'pointer',
                bgcolor: 'rgba(236,240,255,0.74)',
                backdropFilter: 'blur(5px)',
                '&:hover': { borderColor: '#9eaaf9', bgcolor: 'rgba(239,243,255,0.95)' },
                transition: 'all 0.2s',
                mr: 1,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
              }}
            >
              <Phone sx={{ color: 'var(--primary)', fontSize: 20 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#2f344a', fontSize: 12 }}>
                  {PHONE_NUMBER}
                </Typography>
              </Box>
            </Paper>

            <Box sx={{ flex: 1 }} />

            {/* Mobile Location Button */}
            <IconButton
              onClick={handleLocationClick}
              sx={{
                display: { xs: 'flex', sm: 'none' },
                color: 'var(--primary)',
              }}
            >
              <LocationOn />
            </IconButton>

            <Paper
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.2,
                borderRadius: 999,
                border: '1px solid rgba(142,152,205,0.3)',
                bgcolor: 'rgba(236,240,255,0.74)',
                backdropFilter: 'blur(5px)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
                px: 0.35,
                py: 0.15,
              }}
            >
              <IconButton
                onClick={() => {
                  const { normalized, count } = readNormalizedCartFromStorage();
                  setCartCount(count);
                  setCartItems(normalized);
                  setCheckoutOpen(false);
                  setCartOpen(true);
                }}
                sx={{
                  color: '#2f344a',
                  position: 'relative',
                  transition: 'transform 0.2s ease, color 0.2s ease',
                  '&:hover': { color: 'var(--primary)' },
                  '&:active': { transform: 'scale(0.96)' },
                }}
              >
                <Badge
                  badgeContent={cartCount}
                  color="error"
                  sx={{
                    '& .MuiBadge-badge': {
                      bgcolor: '#ff6f1f',
                      color: '#fff',
                      fontSize: 10,
                      minWidth: 18,
                      height: 18,
                    },
                  }}
                >
                  <ShoppingCart sx={{ fontSize: 24 }} />
                </Badge>
              </IconButton>
            </Paper>
          </Toolbar>
        </Container>
      </AppBar>

      <LocationSelectorDialog
        open={locationDialogOpen}
        onClose={() => setLocationDialogOpen(false)}
        selectedBranchId={selectedBranchId}
        requireSelection={!selectedBranchId}
        onSelect={handleBranchSelect}
      />

      <Dialog
        open={cartOpen}
        onClose={() => {
          setCartOpen(false);
          setCheckoutOpen(false);
        }}
        maxWidth={checkoutOpen ? 'lg' : 'sm'}
        fullWidth
        sx={{
          '& .MuiDialog-container': {
            alignItems: checkoutOpen ? 'center' : 'stretch',
            justifyContent: checkoutOpen ? 'center' : { xs: 'center', md: 'flex-end' },
          },
        }}
        PaperProps={{
          sx: {
            width: checkoutOpen ? 'calc(100% - 16px)' : { xs: '100%', sm: 430, md: 460 },
            maxWidth: checkoutOpen ? undefined : { xs: '100%', sm: 430, md: 460 },
            height: checkoutOpen ? 'auto' : { xs: '100dvh', sm: '100dvh' },
            maxHeight: checkoutOpen ? 'calc(100dvh - 32px)' : '100dvh',
            m: checkoutOpen ? { xs: 1, sm: 2 } : 0,
            borderRadius: checkoutOpen ? { xs: 3, sm: 5 } : { xs: 0, sm: 0 },
            boxShadow: '0 18px 44px rgba(0,0,0,0.22)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
          }}
        >
          <Typography component="span" variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
            {checkoutOpen ? 'Checkout' : 'Your Cart'}
          </Typography>
          <IconButton
            onClick={() => {
              setCartOpen(false);
              setCheckoutOpen(false);
            }}
            size="small"
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            pt: 0,
            px: checkoutOpen ? { xs: 1.25, sm: 3 } : { xs: 1.25, sm: 2 },
            pb: checkoutOpen ? { xs: 1.5, sm: 2.5 } : { xs: 1.5, sm: 2 },
            overflowX: 'hidden',
            overflowY: checkoutOpen ? 'auto' : 'auto',
            flex: 1,
            '&::-webkit-scrollbar': { width: 7 },
            '&::-webkit-scrollbar-thumb': { backgroundColor: '#c7c7c7', borderRadius: 999 },
          }}
        >
          {checkoutOpen ? (
            <Box sx={{ pb: 0.5 }}>
              <Grid container spacing={2.5} alignItems="stretch">
                <Grid size={{ xs: 12, md: 7.2 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: { xs: 32, sm: 44 }, lineHeight: 1.05, color: '#111', mb: 1 }}>
                    Checkout
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1.1, color: '#2a2a2a', mb: 2 }}>Delivery Order</Typography>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        placeholder="Full Name"
                        value={checkoutName}
                        onChange={(e) => setCheckoutName(e.target.value)}
                        fullWidth
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, fontWeight: 600, bgcolor: '#fff' } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        placeholder="Email Address"
                        value={checkoutEmail}
                        onChange={(e) => setCheckoutEmail(e.target.value)}
                        fullWidth
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, fontWeight: 600, bgcolor: '#fff' } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        placeholder="Mobile Number"
                        value={checkoutPhone}
                        onChange={(e) => setCheckoutPhone(e.target.value)}
                        fullWidth
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, fontWeight: 600, bgcolor: '#fff' } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        placeholder="Alternate Number"
                        value={checkoutAltPhone}
                        onChange={(e) => setCheckoutAltPhone(e.target.value)}
                        fullWidth
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, fontWeight: 600, bgcolor: '#fff' } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        placeholder="Delivery Address"
                        value={checkoutAddress}
                        onChange={(e) => setCheckoutAddress(e.target.value)}
                        fullWidth
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, fontWeight: 600, bgcolor: '#fff' } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        placeholder="Nearest Landmark"
                        value={checkoutLandmark}
                        onChange={(e) => setCheckoutLandmark(e.target.value)}
                        fullWidth
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, fontWeight: 600, bgcolor: '#fff' } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        placeholder="Delivery Instructions"
                        value={deliveryInstructions}
                        onChange={(e) => setDeliveryInstructions(e.target.value)}
                        fullWidth
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, fontWeight: 600, bgcolor: '#fff' } }}
                      />
                    </Grid>
                  </Grid>
                </Grid>
                <Grid size={{ xs: 12, md: 4.8 }}>
                  <Paper sx={{ border: '1px solid #e8e8e8', borderRadius: 4, p: 2.2, height: '100%' }}>
                    <Typography sx={{ fontWeight: 900, fontSize: { xs: 30, sm: 42 }, lineHeight: 1, color: '#111', mb: 1.2 }}>
                      Your Order
                    </Typography>
                    <Stack spacing={1} sx={{ mb: 1.8 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ color: '#3b3b3b', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>Total</Typography>
                        <Typography sx={{ color: '#111', fontWeight: 800, fontSize: 20, lineHeight: 1 }}>Rs. {cartSubtotal.toFixed(0)}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ color: '#3b3b3b', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>Tax {Number(taxRate || 0).toFixed(0)}%</Typography>
                        <Typography sx={{ color: '#111', fontWeight: 800, fontSize: 20, lineHeight: 1 }}>Rs. {taxAmount.toFixed(0)}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ color: '#3b3b3b', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>Delivery Fee</Typography>
                        <Typography sx={{ color: '#111', fontWeight: 800, fontSize: 20, lineHeight: 1 }}>Rs. {Number(deliveryFee || 0).toFixed(0)}</Typography>
                      </Stack>
                      <Divider sx={{ my: 0.5, borderColor: '#dedede' }} />
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gap: 1 }}>
                        <Typography sx={{ color: '#111', fontSize: { xs: 30, sm: 46 }, fontWeight: 900, lineHeight: 1 }}>
                          Grand Total
                        </Typography>
                        <Typography sx={{ color: '#111', fontSize: { xs: 34, sm: 54 }, fontWeight: 900, lineHeight: 1 }}>
                          Rs. {grandTotal.toFixed(0)}
                        </Typography>
                      </Stack>
                    </Stack>
                    <Button
                      fullWidth
                      variant="contained"
                      sx={{ bgcolor: 'var(--primary)', py: 1.3, borderRadius: 999, fontWeight: 900, fontSize: 18, '&:hover': { bgcolor: 'var(--primary-hover)' } }}
                      onClick={() => {
                        clearCart();
                        setCheckoutOpen(false);
                        setCartOpen(false);
                      }}
                    >
                      Place Order
                    </Button>
                    <Paper sx={{ mt: 1.6, p: 1.5, bgcolor: '#f4f8ff', borderRadius: 3, border: '1px solid #dbe8ff' }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CheckCircle sx={{ color: '#2e7d32', fontSize: 20 }} />
                        <Typography sx={{ color: '#123', fontWeight: 800, fontSize: 14, lineHeight: 1.25 }}>
                          Your order will be delivered approximately in 45 minutes.
                        </Typography>
                      </Stack>
                    </Paper>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          ) : visibleCartItems.length === 0 ? (
            <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <ShoppingBag sx={{ fontSize: 72, color: 'var(--primary)' }} />
              <Typography sx={{ mt: 2, fontWeight: 900, fontSize: 20, color: 'var(--text-primary)' }}>
                Your Cart is Empty
              </Typography>
              <Typography sx={{ mt: 0.5, color: 'var(--text-secondary)', maxWidth: 360 }}>
                Looks like you haven’t added anything to your cart yet. Start exploring and shop your favorite items!
              </Typography>
              <Button
                variant="contained"
                sx={{ mt: 2, bgcolor: 'var(--primary)', '&:hover': { bgcolor: 'var(--primary-hover)' } }}
                onClick={() => {
                  setCartOpen(false);
                  navigate('/customer');
                }}
              >
                Browse Products
              </Button>
            </Box>
          ) : (
            <Box sx={{ pb: 0, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <Paper
                sx={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 2,
                  boxShadow: 'var(--shadow-sm)',
                  overflow: 'hidden',
                  mb: 1.5,
                  bgcolor: '#fff',
                }}
              >
                <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 800 }}>Selected items ({visibleCartItems.length})</Typography>
                  <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-end', sm: 'flex-start' } }}>
                    <Button size="small" onClick={() => setCartOpen(false)} sx={{ textTransform: 'none' }}>Add more items</Button>
                    <Button size="small" color="error" onClick={clearCart} sx={{ textTransform: 'none' }}>Clear</Button>
                  </Stack>
                </Box>
                <Divider />
                <Box sx={{ maxHeight: { xs: '30dvh', sm: '32dvh' }, overflowY: 'auto', p: 1 }}>
                  <Stack spacing={1.5}>
                    {visibleCartItems.map((i) => {
                      const rawImg = Array.isArray((i as any)?.images) ? (i as any).images[0] : (i.image as any);
                      const imgUrl = api.getImageUrl(rawImg);
                      return (
                        <Box key={i.cartKey}>
                          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                            <Box
                              sx={{
                                width: 56,
                                height: 56,
                                borderRadius: 2,
                                border: '1px solid var(--border-color)',
                                overflow: 'hidden',
                                bgcolor: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {imgUrl ? (
                                <Box component="img" src={imgUrl} alt={i.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <Box sx={{ width: '100%', height: '100%', bgcolor: 'var(--primary-light)' }} />
                              )}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                sx={{
                                  fontWeight: 800,
                                  color: 'var(--text-primary)',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  lineHeight: 1.2,
                                }}
                              >
                                {i.name}
                              </Typography>
                              <Typography sx={{ color: 'var(--primary)', fontWeight: 900 }}>₨{Number(i.price || 0).toFixed(0)}</Typography>
                              {i.specialInstructions ? (
                                <Typography sx={{ color: 'var(--text-secondary)', fontSize: 12, wordBreak: 'break-word' }}>
                                  Note: {i.specialInstructions}
                                </Typography>
                              ) : null}
                            </Box>
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={0.5}
                              sx={{ ml: { xs: 'auto', sm: 0 }, width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-end', sm: 'flex-start' } }}
                            >
                              <IconButton size="small" onClick={() => changeQty(i.cartKey, -1)}>
                                <Remove fontSize="small" />
                              </IconButton>
                              <Typography sx={{ fontWeight: 900, minWidth: 22, textAlign: 'center' }}>{i.quantity}</Typography>
                              <IconButton size="small" onClick={() => changeQty(i.cartKey, 1)}>
                                <Add fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => removeItem(i.cartKey)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              </Paper>

              {suggestedItems.length > 0 ? (
                <Paper sx={{ border: '1px solid var(--border-color)', borderRadius: 2, boxShadow: 'var(--shadow-sm)', mb: 1.5, p: 1.5 }}>
                  <Typography sx={{ fontWeight: 900, color: 'var(--text-primary)' }}>Popular with your order</Typography>
                  <Typography sx={{ color: 'var(--text-secondary)', fontSize: 13, mb: 1 }}>
                    Customers often buy these together
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr' }, gap: 1 }}>
                    {suggestedItems.map((s) => {
                      const imgUrl = api.getImageUrl(s.image);
                      return (
                        <Paper key={s.id} sx={{ p: 1, borderRadius: 2, border: '1px solid var(--border-color)', boxShadow: 'none', overflow: 'hidden', minWidth: 0 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border-color)', overflow: 'hidden', bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {imgUrl ? (
                                <Box component="img" src={imgUrl} alt={s.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <Typography sx={{ fontWeight: 900, color: 'var(--primary)' }}>
                                  {s.name?.charAt(0)?.toUpperCase?.() || '+'}
                                </Typography>
                              )}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                              <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#2A2A2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {s.name}
                              </Typography>
                              <Typography sx={{ color: '#121212', fontWeight: 800, fontSize: 13, letterSpacing: 0.2 }}>Rs {Number(s.price || 0).toFixed(0)}</Typography>
                            </Box>
                            <IconButton sx={{ color: 'var(--primary)' }} onClick={() => addSuggestedToCart(s)}>
                              <Add />
                            </IconButton>
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Box>
                </Paper>
              ) : null}

              <Paper sx={{ border: '1px solid #ececec', borderRadius: 2, boxShadow: 'var(--shadow-sm)', p: 1.5, mt: 'auto' }}>
                <Stack spacing={0.8}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ color: '#111', fontWeight: 500, fontSize: { xs: 17, sm: 18 }, lineHeight: 1.2, fontFamily: "'Inter', sans-serif" }}>
                      Total
                    </Typography>
                    <Typography sx={{ color: '#111', fontWeight: 600, fontSize: { xs: 17, sm: 18 }, letterSpacing: 0, lineHeight: 1.2, fontFamily: "'Inter', sans-serif" }}>
                      Rs. {cartSubtotal.toFixed(0)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ color: '#111', fontWeight: 500, fontSize: { xs: 17, sm: 18 }, lineHeight: 1.2, fontFamily: "'Inter', sans-serif" }}>
                      Tax {Number(taxRate || 0).toFixed(0)}%
                    </Typography>
                    <Typography sx={{ color: '#111', fontWeight: 600, fontSize: { xs: 17, sm: 18 }, letterSpacing: 0, lineHeight: 1.2, fontFamily: "'Inter', sans-serif" }}>
                      Rs. {taxAmount.toFixed(0)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ color: '#111', fontWeight: 500, fontSize: { xs: 17, sm: 18 }, lineHeight: 1.2, fontFamily: "'Inter', sans-serif" }}>
                      Delivery Fee
                    </Typography>
                    <Typography sx={{ color: '#111', fontWeight: 600, fontSize: { xs: 17, sm: 18 }, letterSpacing: 0, lineHeight: 1.2, fontFamily: "'Inter', sans-serif" }}>
                      Rs. {Number(deliveryFee || 0).toFixed(0)}
                    </Typography>
                  </Stack>
                  <Divider sx={{ my: 0.3 }} />
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5, gap: 1 }}>
                    <Typography sx={{ color: '#111', fontWeight: 500, fontSize: { xs: 17, sm: 18 }, lineHeight: 1.2, fontFamily: "'Inter', sans-serif" }}>
                      Grand Total
                    </Typography>
                    <Typography sx={{ color: '#111', fontWeight: 600, fontSize: { xs: 17, sm: 18 }, lineHeight: 1.2, fontFamily: "'Inter', sans-serif" }}>
                      Rs. {grandTotal.toFixed(0)}
                    </Typography>
                  </Stack>
                </Stack>
                <Button
                  fullWidth
                  variant="contained"
                  sx={{
                    mt: 1.5,
                    bgcolor: '#ef1b2d',
                    py: 1.25,
                    borderRadius: 2.2,
                    '&:hover': { bgcolor: '#d91324' },
                  }}
                  onClick={() => {
                    setCartOpen(false);
                    setCheckoutOpen(false);
                    navigate('/customer/checkout');
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                    <span style={{ fontSize: 'clamp(18px, 2.2vw, 20px)', lineHeight: 1.2, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
                      Checkout
                    </span>
                    <ArrowForward />
                  </Stack>
                </Button>
              </Paper>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Container maxWidth="lg" sx={{ py: 2, animation: 'fadeInUp .35s ease', minHeight: 'calc(100vh - 400px)', '@keyframes fadeInUp': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
        {children}
      </Container>
      <Footer />
    </Box>
  );
}
