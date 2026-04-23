import type { ReactNode } from 'react';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  AppBar,
  Badge,
  Box,
  Button,
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
  ShoppingCart,
  Close,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import Footer from '../footer/Footer';
import CustomerCartModal from './CustomerCartModal';

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

const extractCartArray = (parsed: any): any[] => {
  if (!parsed) return [];
  if (typeof parsed === 'string') {
    const trimmed = parsed.trim();
    if (!trimmed) return [];
    try {
      return extractCartArray(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed !== 'object') return [];

  const arrayLikeLength = (parsed as any)?.length;
  if (typeof arrayLikeLength === 'number' && Number.isFinite(arrayLikeLength) && arrayLikeLength > 0) {
    const cap = Math.min(1000, Math.max(0, Math.floor(arrayLikeLength)));
    const list: any[] = [];
    for (let i = 0; i < cap; i += 1) {
      const value = (parsed as any)[i];
      if (value != null) list.push(value);
    }
    if (list.length > 0) return list;
  }

  const nestedCandidates = [
    parsed?.items,
    parsed?.cartItems,
    parsed?.cart,
    parsed?.cart?.items,
    parsed?.data?.items,
    parsed?.data?.cartItems,
    parsed?.data?.cart,
    parsed?.data?.cart?.items,
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
  const [cartOpen, setCartOpen] = useState(false);
  const [taxRate, setTaxRate] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
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

  const cartStorageSnapshot = useSyncExternalStore(
    (onStoreChange) => {
      const onStorage = (e: StorageEvent) => {
        if (e.key === 'customer_cart') onStoreChange();
      };
      const onCustom = () => onStoreChange();
      window.addEventListener('storage', onStorage);
      window.addEventListener('customer_cart_updated', onCustom as EventListener);
      return () => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('customer_cart_updated', onCustom as EventListener);
      };
    },
    () => localStorage.getItem('customer_cart') || '[]',
    () => '[]'
  );

  const storageCartItems = useMemo(() => {
    try {
      const parsed = JSON.parse(cartStorageSnapshot || '[]');
      return normalizeCartItems(parsed);
    } catch {
      return [] as CartItem[];
    }
  }, [cartStorageSnapshot]);

  const storageCartCount = useMemo(() => {
    return storageCartItems.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
  }, [storageCartItems]);

  const openMiniCartFromStorage = () => {
    setCheckoutOpen(false);
    setCartOpen(true);
  };

  useEffect(() => {
    const openCart = () => {
      openMiniCartFromStorage();
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

  const visibleCartItems = storageCartItems;

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

  const writeCart = (items: CartItem[]) => {
    const normalized = toStoredCartItems(items);
    localStorage.setItem('customer_cart', JSON.stringify(normalized));
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
                  openMiniCartFromStorage();
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
                  badgeContent={storageCartCount}
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

      <CustomerCartModal
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        checkoutOpen={checkoutOpen}
        setCheckoutOpen={setCheckoutOpen}
        checkoutName={checkoutName}
        setCheckoutName={setCheckoutName}
        checkoutEmail={checkoutEmail}
        setCheckoutEmail={setCheckoutEmail}
        checkoutPhone={checkoutPhone}
        setCheckoutPhone={setCheckoutPhone}
        checkoutAltPhone={checkoutAltPhone}
        setCheckoutAltPhone={setCheckoutAltPhone}
        checkoutAddress={checkoutAddress}
        setCheckoutAddress={setCheckoutAddress}
        checkoutLandmark={checkoutLandmark}
        setCheckoutLandmark={setCheckoutLandmark}
        deliveryInstructions={deliveryInstructions}
        setDeliveryInstructions={setDeliveryInstructions}
        visibleCartItems={visibleCartItems}
        taxRate={taxRate}
        deliveryFee={deliveryFee}
        cartSubtotal={cartSubtotal}
        taxAmount={taxAmount}
        grandTotal={grandTotal}
        clearCart={clearCart}
        changeQty={changeQty}
        removeItem={removeItem}
      />

      <Container maxWidth="lg" sx={{ py: 2, animation: 'fadeInUp .35s ease', minHeight: 'calc(100vh - 400px)', '@keyframes fadeInUp': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
        {children}
      </Container>
      <Footer />
    </Box>
  );
}
