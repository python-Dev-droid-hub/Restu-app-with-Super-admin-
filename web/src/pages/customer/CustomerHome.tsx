import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Card, CardActionArea, CardContent, CardMedia, Grid, IconButton, Paper, Stack, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon, Close as CloseIcon } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import { io, type Socket } from 'socket.io-client';

type HomeBanner = {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  discount?: number;
};

type HomeProduct = {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  image?: string;
  rating?: number;
  reviews?: number;
  category?: string;
  displayOrder?: number;
};

type CartItem = {
  productId: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  specialInstructions?: string;
};

type DealItem = {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  originalPrice?: number;
  discount?: number;
  isActive?: boolean;
  items?: Array<{ productId?: string; quantity?: number }>;
  isOrderable?: boolean;
  displayOrder?: number;
};

type DealCampaign = {
  _id: string;
  name: string;
  displayOrder?: number;
  status?: string;
  heroBanner?: {
    imageUrl?: string;
    title?: string;
    subtitle?: string;
    bgColor?: string;
  };
  deals: DealItem[];
};

type CategorySection = {
  id: string;
  name: string;
  imageUrl?: string;
  displayOrder?: number;
  products: HomeProduct[];
};

type MenuCategory = {
  _id?: string;
  id?: string;
  name?: string;
  displayOrder?: number;
  icon?: string;
  image?: string;
  imageUrl?: string;
  products?: any[];
  items?: any[];
};

type CustomerHomeResponse = {
  banners: HomeBanner[];
};

type SearchResultItem =
  | ({ resultType: 'product'; categoryName?: string } & HomeProduct)
  | ({ resultType: 'deal' } & DealItem);

type ActiveBannerApiItem = {
  _id?: string;
  id?: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  image?: string;
  isActive?: boolean;
  displayOrder?: number;
};

const extractImagePath = (raw: any): string => {
  if (!raw) return '';
  if (typeof raw === 'string') {
    const value = raw.trim();
    if (!value) return '';
    if (
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('/') ||
      value.startsWith('data:image') ||
      value.startsWith('blob:')
    ) {
      return value;
    }
    if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}'))) {
      try {
        return extractImagePath(JSON.parse(value));
      } catch {
        return value;
      }
    }
    return value;
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

const getDisplayOrder = (value: unknown): number => {
  return Number.isFinite(Number(value)) ? Number(value) : Number.MAX_SAFE_INTEGER;
};

const compareByDisplayOrder = (a: { displayOrder?: number; name?: string; title?: string }, b: { displayOrder?: number; name?: string; title?: string }) => {
  const displayOrderDifference = getDisplayOrder(a?.displayOrder) - getDisplayOrder(b?.displayOrder);
  if (displayOrderDifference !== 0) {
    return displayOrderDifference;
  }

  return String(a?.title || a?.name || '').localeCompare(String(b?.title || b?.name || ''));
};

export default function CustomerHome() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [home, setHome] = useState<CustomerHomeResponse>({ banners: [] });
  const [categorySections, setCategorySections] = useState<CategorySection[]>([]);
  const [dealCampaigns, setDealCampaigns] = useState<DealCampaign[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(localStorage.getItem('selectedBranchId') || '');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<{ id: string; name: string; description?: string; price: number; image?: string } | null>(null);
  const [pendingQty, setPendingQty] = useState(1);
  const [pendingNote, setPendingNote] = useState('');
  const socketRef = useRef<Socket | null>(null);

  const normalizedSearch = useMemo(() => search.trim(), [search]);

  const getServerHost = (): string => {
    const rawApiUrl = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
    const rawProxyTarget = (import.meta as any)?.env?.VITE_PROXY_TARGET as string | undefined;

    const normalizeHost = (value?: string): string => {
      const v = (value || '').trim();
      if (!v) return '';
      return v.replace(/\/?api\/?$/, '').replace(/\/$/, '');
    };

    const fromEnv = normalizeHost(rawProxyTarget) || normalizeHost(rawApiUrl);
    if (fromEnv) return fromEnv;

    const protocol = window.location.protocol || 'http:';
    const hostname = window.location.hostname || 'localhost';
    return `${protocol}//${hostname}:3101`;
  };

  const normalizeMediaUrl = (uri?: string): string => {
    if (!uri) return '';
    const value = String(uri).trim();
    if (!value) return '';
    const lower = value.toLowerCase();
    if (lower.startsWith('file:') || lower.includes('var/mobile') || lower.includes('imagepicker')) return '';
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:') || value.startsWith('blob:')) return value;
    const normalizedPath = value.startsWith('/')
      ? value
      : (value.startsWith('uploads/') || value.startsWith('src/uploads/'))
          ? `/${value.replace(/^src\//, '')}`
          : value;
    if (!normalizedPath.startsWith('/')) return normalizedPath;
    return `${getServerHost()}${normalizedPath}`;
  };

  useEffect(() => {
    const syncBranch = () => {
      setSelectedBranchId(localStorage.getItem('selectedBranchId') || '');
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'selectedBranchId') syncBranch();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('selected_branch_changed', syncBranch as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('selected_branch_changed', syncBranch as EventListener);
    };
  }, []);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
    if (!socketRef.current) {
      socketRef.current = io(getServerHost(), {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        auth: token ? { token } : undefined,
      });
    }

    const socket = socketRef.current;
    const normalizeHomeBanners = (raw: any[]): HomeBanner[] => {
      return raw
        .map((item: any, index: number) => ({
          id: String(item?.id || item?._id || `banner-${index}`),
          title: String(item?.title || 'Banner'),
          subtitle: item?.subtitle || item?.description || '',
          image: extractImagePath([item?.image, item?.imageUrl]),
          discount: Number(item?.discount || 0) || undefined,
        }))
        .filter((item) => Boolean(item.image));
    };

    const normalizeActiveBanners = (raw: any[]): HomeBanner[] => {
      return raw
        .filter((item: ActiveBannerApiItem) => item?.isActive !== false)
        .sort((a: ActiveBannerApiItem, b: ActiveBannerApiItem) => Number(a?.displayOrder || 0) - Number(b?.displayOrder || 0))
        .map((item: ActiveBannerApiItem, index: number) => ({
          id: String(item.id || item._id || `banner-active-${index}`),
          title: String(item.title || 'Banner'),
          subtitle: item.subtitle || '',
          image: extractImagePath([item?.imageUrl, item?.image]),
        }))
        .filter((item) => Boolean(item.image));
    };

    const onData = (payload: any) => {
      const activeBannersRaw = payload?.activeBanners || payload?.activeBanners?.banners || [];
      const menuRaw = payload?.menu || {};
      const dealsRaw = payload?.dealCampaigns || {};
      const customerDealsRaw = payload?.customerDeals || {};

      const activeBanners = normalizeActiveBanners(Array.isArray(activeBannersRaw) ? activeBannersRaw : []);
      const homeBanners = normalizeHomeBanners([]);
      const finalBanners = activeBanners.length > 0 ? activeBanners : homeBanners;

      const apiCategories: MenuCategory[] = (menuRaw as any)?.categories || (menuRaw as any)?.data?.categories || [];
      const sections: CategorySection[] = [...apiCategories]
        .sort(compareByDisplayOrder)
        .map((cat, catIndex) => {
          const categoryProducts = Array.isArray(cat.products) ? cat.products : (Array.isArray(cat.items) ? cat.items : []);
          const mappedProducts: HomeProduct[] = [...categoryProducts]
            .sort(compareByDisplayOrder)
            .map((p: any, productIndex: number) => ({
              id: String(p?._id || p?.id || `${catIndex}-${productIndex}`),
              name: String(p?.name || 'Product'),
              description: p?.description || '',
              price: Number(p?.effectivePrice ?? p?.price ?? 0),
              originalPrice: Number(p?.originalPrice ?? p?.effectivePrice ?? p?.price ?? 0),
              image: extractImagePath([p?.images, p?.image, p?.imageUrl, p?.thumbnail, p?.media]),
              rating: Number(p?.rating || 0),
              reviews: Number(p?.reviews || 0),
              category: String(cat?.name || 'Food'),
              displayOrder: Number.isFinite(Number(p?.displayOrder)) ? Number(p.displayOrder) : undefined,
            }));

          return {
            id: String(cat._id || cat.id || `cat-${catIndex}`),
            name: String(cat.name || 'Category'),
            imageUrl: extractImagePath(cat.imageUrl),
            displayOrder: Number.isFinite(Number(cat?.displayOrder)) ? Number(cat.displayOrder) : undefined,
            products: mappedProducts,
          };
        });
      setCategorySections(sections);
      setHome({ banners: finalBanners });

      const campaigns = (dealsRaw as any)?.campaigns;
      const activeCampaigns = Array.isArray(campaigns)
        ? campaigns.filter((c: any) => c?.status === 'ACTIVE' || c?.status === undefined).sort(compareByDisplayOrder)
        : [];

      const normalizedCampaigns: DealCampaign[] = [];
      for (const campaign of activeCampaigns) {
        const dealList = Array.isArray(campaign?.deals) ? [...campaign.deals].sort(compareByDisplayOrder) : [];
        const normalizedDeals: DealItem[] = [];
        for (const deal of dealList) {
          if (deal?.isActive === false) continue;
          if (!deal?._id || !deal?.title) continue;
          const configuredItems = Array.isArray(deal?.items) ? deal.items.filter((item: any) => item?.productId) : [];
          normalizedDeals.push({
            _id: String(deal._id),
            title: String(deal.title),
            description: deal.description || '',
            imageUrl: deal.imageUrl || deal.image,
            price: Number(deal.price || 0) || undefined,
            originalPrice: Number(deal.originalPrice || 0) || undefined,
            discount: Number(deal.discount || 0) || undefined,
            isActive: deal.isActive,
            isOrderable: configuredItems.length > 0,
            displayOrder: Number.isFinite(Number(deal?.displayOrder)) ? Number(deal.displayOrder) : undefined,
            items: configuredItems.map((item: any) => ({
              productId: item?.productId ? String(item.productId) : undefined,
              quantity: Number(item?.quantity || 1),
            })),
          });
        }
        if (normalizedDeals.length === 0) continue;
        normalizedCampaigns.push({
          _id: String(campaign?._id || campaign?.id || `campaign-${normalizedCampaigns.length}`),
          name: String(campaign?.name || 'Campaign'),
          displayOrder: Number.isFinite(Number(campaign?.displayOrder)) ? Number(campaign.displayOrder) : undefined,
          status: campaign?.status,
          heroBanner: campaign?.heroBanner
            ? {
                imageUrl: campaign.heroBanner.imageUrl,
                title: campaign.heroBanner.title,
                subtitle: campaign.heroBanner.subtitle,
                bgColor: campaign.heroBanner.bgColor,
              }
            : undefined,
          deals: normalizedDeals,
        });
      }

      if (normalizedCampaigns.length > 0) {
        setDealCampaigns(normalizedCampaigns);
      } else {
        const fallbackDeals: DealItem[] = ((customerDealsRaw as any)?.deals || []).map((d: any) => ({
          _id: String(d?.id || d?._id),
          title: String(d?.title || 'Deal'),
          description: d?.description || '',
          imageUrl: d?.image || d?.imageUrl,
          discount: Number(d?.discount || 0),
        }));
        setDealCampaigns(fallbackDeals.length > 0 ? [{ _id: 'fallback-campaign', name: 'Deals', deals: fallbackDeals }] : []);
      }

      setLoading(false);
    };

    const onError = () => {
      setLoading(false);
    };

    socket.off('customer_home:data');
    socket.on('customer_home:data', onData);
    socket.on('connect_error', onError);

    const hasBranch = selectedBranchId && selectedBranchId !== 'all';
    const request = () => {
      setLoading(true);
      socket.emit('customer_home:get', { branchId: hasBranch ? selectedBranchId : undefined });
    };

    if (socket.connected) request();
    else socket.once('connect', request);

    return () => {
      socket.off('customer_home:data', onData);
      socket.off('connect_error', onError);
      socket.off('connect', request);
    };
  }, [selectedBranchId]);

  const bannerItems = home.banners;
  const filteredCategorySections = useMemo(() => {
    if (!normalizedSearch) return categorySections;
    const q = normalizedSearch.toLowerCase();
    return categorySections
      .map((section) => ({
        ...section,
        products: section.products.filter((p) => {
          const name = String(p.name || '').toLowerCase();
          const description = String(p.description || '').toLowerCase();
          const category = String(p.category || '').toLowerCase();
          return name.includes(q) || description.includes(q) || category.includes(q);
        }),
      }))
      .filter((section) => section.products.length > 0);
  }, [categorySections, normalizedSearch]);

  const hasAnyProducts = useMemo(() => {
    return filteredCategorySections.some((section) => section.products.length > 0);
  }, [filteredCategorySections]);

  const searchResults = useMemo<SearchResultItem[]>(() => {
    if (!normalizedSearch) return [];

    const q = normalizedSearch.toLowerCase();
    const productResults: SearchResultItem[] = categorySections.flatMap((section) =>
      section.products
        .filter((product) => {
          const name = String(product.name || '').toLowerCase();
          const description = String(product.description || '').toLowerCase();
          const category = String(section.name || product.category || '').toLowerCase();
          return name.includes(q) || description.includes(q) || category.includes(q);
        })
        .map((product) => ({
          ...product,
          resultType: 'product' as const,
          categoryName: section.name,
        }))
    );

    const dealResults: SearchResultItem[] = dealCampaigns.flatMap((campaign) =>
      (campaign.deals || [])
        .filter((deal) => {
          const title = String(deal.title || '').toLowerCase();
          const description = String(deal.description || '').toLowerCase();
          const campaignName = String(campaign.name || '').toLowerCase();
          return title.includes(q) || description.includes(q) || campaignName.includes(q);
        })
        .map((deal) => ({
          ...deal,
          resultType: 'deal' as const,
        }))
    );

    return [...dealResults, ...productResults];
  }, [categorySections, dealCampaigns, normalizedSearch]);

  const pickProductImage = (prod: any): string => {
    return normalizeMediaUrl(extractImagePath([prod?.images, prod?.image, prod?.imageUrl, prod?.thumbnail, prod?.media]));
  };

  const renderProductCard = (p: HomeProduct) => {
    const img = pickProductImage(p as any);
    return (
      <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
        <Card
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            bgcolor: 'var(--bg-card)',
            height: '100%',
            transition: 'transform 0.25s ease, box-shadow 0.25s ease',
            '&:hover': { transform: 'translateY(-4px)', boxShadow: 'var(--shadow-md)' },
          }}
        >
          <CardActionArea component="div" sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <Box sx={{ width: '100%', height: { xs: 220, md: 240 }, bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {img ? (
                <Box
                  component="img"
                  src={img}
                  alt={p.name}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    p: 1.25,
                    transition: 'transform 0.25s ease',
                  }}
                />
              ) : (
                <Box sx={{ width: '100%', height: '100%', bgcolor: 'var(--primary-light)' }} />
              )}
            </Box>
            <CardContent sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 900, color: 'var(--text-primary)' }}>{p.name}</Typography>
              {p.description ? (
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5 }} noWrap>
                  {p.description}
                </Typography>
              ) : null}
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                <Typography sx={{ color: 'var(--primary)', fontWeight: 900 }}>
                  ₨{Number(p.price || 0).toFixed(0)}
                </Typography>
                {p.originalPrice && p.originalPrice > p.price ? (
                  <Typography sx={{ color: 'var(--text-hint)', textDecoration: 'line-through', fontWeight: 700 }}>
                    ₨{Number(p.originalPrice).toFixed(0)}
                  </Typography>
                ) : (
                  <Box />
                )}
              </Stack>
              <Button
                fullWidth
                variant="contained"
                onClick={() => {
                  setPendingItem({
                    id: String((p as any).id || (p as any)._id || ''),
                    name: p.name,
                    description: p.description,
                    price: Number(p.price || 0),
                    image: (p as any).image,
                  });
                  setPendingQty(1);
                  setPendingNote('');
                  setAddDialogOpen(true);
                }}
                sx={{
                  mt: 1.25,
                  bgcolor: 'var(--primary)',
                  transition: 'transform 0.15s ease, background 0.2s ease',
                  '&:hover': { bgcolor: 'var(--primary-hover)', transform: 'translateY(-1px)' },
                  '&:active': { transform: 'scale(0.98)' },
                }}
              >
                Add to cart
              </Button>
            </CardContent>
          </CardActionArea>
        </Card>
      </Grid>
    );
  };
  
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll banners
  useEffect(() => {
    if (bannerItems.length <= 1) return;
    
    const timer = setInterval(() => {
      setActiveBannerIndex((prev) => {
        const next = (prev + 1) % bannerItems.length;
        if (scrollContainerRef.current) {
          const scrollWidth = scrollContainerRef.current.scrollWidth / bannerItems.length;
          scrollContainerRef.current.scrollTo({ left: next * scrollWidth, behavior: 'smooth' });
        }
        return next;
      });
    }, 5000);
    
    return () => clearInterval(timer);
  }, [bannerItems.length]);

  const handleBannerDotClick = (index: number) => {
    setActiveBannerIndex(index);
    if (scrollContainerRef.current) {
      const scrollWidth = scrollContainerRef.current.scrollWidth / bannerItems.length;
      scrollContainerRef.current.scrollTo({ left: index * scrollWidth, behavior: 'smooth' });
    }
  };

  const readCart = (): CartItem[] => {
    try {
      const raw = localStorage.getItem('customer_cart');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeCart = (items: CartItem[]) => {
    localStorage.setItem('customer_cart', JSON.stringify(items));
    window.dispatchEvent(new Event('customer_cart_updated'));
  };


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Mobile-style Banner Carousel */}
      {bannerItems.length > 0 && (
        <Box sx={{ position: 'relative' }}>
          <Box
            ref={scrollContainerRef}
            sx={{
              display: 'flex',
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              scrollBehavior: 'smooth',
              '&::-webkit-scrollbar': { display: 'none' },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
          >
            {bannerItems.map((b) => {
              const img = normalizeMediaUrl((b as any).image);
              return (
                <Box
                  key={b.id}
                  sx={{
                    flex: '0 0 100%',
                    scrollSnapAlign: 'start',
                    px: 1,
                  }}
                >
                  <Paper
                    sx={{
                      width: '100%',
                      height: { xs: 260, sm: 320, md: 360 },
                      borderRadius: 3,
                      overflow: 'hidden',
                      position: 'relative',
                      boxShadow: 'var(--shadow-md)',
                      bgcolor: '#fff',
                    }}
                  >
                    {img ? (
                      <Box
                        component="img"
                        src={img}
                        alt={b.title || 'Banner'}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <Box sx={{ width: '100%', height: '100%', bgcolor: 'var(--primary)' }} />
                    )}
                  </Paper>
                </Box>
              );
            })}
          </Box>
          
          {/* Pagination Dots */}
          {bannerItems.length > 1 && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                gap: 1,
                mt: 1.5,
              }}
            >
              {bannerItems.map((_, index) => (
                <IconButton
                  key={index}
                  onClick={() => handleBannerDotClick(index)}
                  sx={{
                    width: activeBannerIndex === index ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    bgcolor: activeBannerIndex === index ? 'var(--primary)' : 'var(--border-color-dark)',
                    p: 0,
                    minWidth: 'unset',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: activeBannerIndex === index ? 'var(--primary)' : 'var(--text-hint)',
                    },
                  }}
                />
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Search */}
      <TextField
        placeholder="Search food, restaurants..."
        fullWidth
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: <SearchIcon style={{ marginRight: 10 }} />,
        }}
        sx={{
          bgcolor: 'var(--bg-card)',
          borderRadius: 2,
          '& .MuiOutlinedInput-root': { borderRadius: 2 },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-color)' },
          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--primary)' },
        }}
      />

      {normalizedSearch ? (
        <Box>
          {searchResults.length > 0 ? (
            <Grid container spacing={2}>
              {searchResults.map((result) => {
                if (result.resultType === 'deal') {
                  const id = String(result._id);
                  const img = normalizeMediaUrl((result as any).imageUrl);
                  const title = result.title || 'Deal';
                  const description = result.description || '';
                  const badgeText = typeof result.discount === 'number' ? `${result.discount}% OFF` : '';
                  const originalPrice = Number(result.originalPrice || 0);
                  const calculatedPrice = originalPrice > 0 && Number(result.discount || 0) > 0
                    ? Math.max(0, originalPrice - (originalPrice * Number(result.discount || 0)) / 100)
                    : 0;
                  const displayPrice = Number(result.price || 0) > 0 ? Number(result.price) : calculatedPrice;
                  const canAddToCart = result.isOrderable !== false;

                  return (
                    <Grid key={`deal-${id}`} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                      <Card
                        sx={{
                          borderRadius: 3,
                          overflow: 'hidden',
                          border: '1px solid var(--border-color)',
                          boxShadow: 'var(--shadow-sm)',
                          bgcolor: 'var(--bg-card)',
                          height: '100%',
                        }}
                      >
                        <CardActionArea component="div" sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                          {img ? (
                            <CardMedia
                              component="img"
                              image={img}
                              alt={title}
                              sx={{
                                height: { xs: 210, md: 230 },
                                objectFit: 'contain',
                                bgcolor: '#fff',
                                p: 1,
                              }}
                            />
                          ) : null}
                          <CardContent sx={{ flex: 1 }}>
                            <Typography sx={{ fontWeight: 900, color: 'var(--text-primary)' }}>
                              {title}
                            </Typography>
                            {description ? (
                              <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5 }} noWrap>
                                {description}
                              </Typography>
                            ) : null}
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                              <Typography sx={{ color: 'var(--primary)', fontWeight: 900 }}>
                                ₨{displayPrice > 0 ? displayPrice.toFixed(0) : '0'}
                              </Typography>
                              {originalPrice > displayPrice && displayPrice > 0 ? (
                                <Typography sx={{ color: 'var(--text-hint)', textDecoration: 'line-through', fontWeight: 700 }}>
                                  ₨{originalPrice.toFixed(0)}
                                </Typography>
                              ) : (
                                <Box />
                              )}
                            </Stack>
                            {badgeText ? (
                              <Typography sx={{ color: 'var(--primary)', fontWeight: 800, mt: 0.5 }}>
                                {badgeText}
                              </Typography>
                            ) : null}
                            <Button
                              fullWidth
                              variant="contained"
                              disabled={!canAddToCart}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingItem({
                                  id,
                                  name: title,
                                  description,
                                  price: displayPrice > 0 ? displayPrice : 0,
                                  image: (result as any).imageUrl,
                                });
                                setPendingQty(1);
                                setPendingNote('');
                                setAddDialogOpen(true);
                              }}
                              sx={{ mt: 1.25, bgcolor: 'var(--primary)', '&:hover': { bgcolor: 'var(--primary-hover)' } }}
                            >
                              {canAddToCart ? 'Add to cart' : 'Unavailable'}
                            </Button>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  );
                }

                return renderProductCard(result);
              })}
            </Grid>
          ) : (
            <Paper sx={{ p: 2, mt: 1, borderRadius: 3, border: '1px solid var(--border-color)', bgcolor: 'var(--bg-card)' }}>
              <Typography sx={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
                No matching items found.
              </Typography>
            </Paper>
          )}
        </Box>
      ) : null}

      {!normalizedSearch && dealCampaigns.map((campaign) => {
        const heroImage = normalizeMediaUrl(campaign.heroBanner?.imageUrl);
        return (
          <Box key={campaign._id}>
            {heroImage ? (
              <Paper
                sx={{
                  width: '100%',
                  height: { xs: 170, sm: 210, md: 240 },
                  borderRadius: 3,
                  overflow: 'hidden',
                  mb: 1.5,
                  bgcolor: 'var(--bg-card)',
                }}
              >
                <Box
                  component="img"
                  src={heroImage}
                  alt={campaign.heroBanner?.title || campaign.name}
                  sx={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', display: 'block' }}
                />
              </Paper>
            ) : null}
            <Grid container spacing={2}>
              {campaign.deals.map((d) => {
                const id = String(d._id);
                const img = normalizeMediaUrl((d as any).imageUrl);
                const title = d.title || 'Deal';
                const description = d.description || '';
                const badgeText = typeof d.discount === 'number' ? `${d.discount}% OFF` : '';
                const originalPrice = Number(d.originalPrice || 0);
                const calculatedPrice = originalPrice > 0 && Number(d.discount || 0) > 0
                  ? Math.max(0, originalPrice - (originalPrice * Number(d.discount || 0)) / 100)
                  : 0;
                const displayPrice = Number(d.price || 0) > 0 ? Number(d.price) : calculatedPrice;
                const canAddToCart = d.isOrderable !== false;
                return (
                  <Grid key={id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        overflow: 'hidden',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-sm)',
                        bgcolor: 'var(--bg-card)',
                        height: '100%',
                      }}
                    >
                      <CardActionArea component="div" sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                        {img ? (
                          <CardMedia
                            component="img"
                            image={img}
                            alt={title}
                            sx={{
                              height: { xs: 210, md: 230 },
                              objectFit: 'contain',
                              bgcolor: '#fff',
                              p: 1,
                            }}
                          />
                        ) : null}
                        <CardContent sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 900, color: 'var(--text-primary)' }}>
                            {title}
                          </Typography>
                          {description ? (
                            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5 }} noWrap>
                              {description}
                            </Typography>
                          ) : null}
                          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                            <Typography sx={{ color: 'var(--primary)', fontWeight: 900 }}>
                              ₨{displayPrice > 0 ? displayPrice.toFixed(0) : '0'}
                            </Typography>
                            {originalPrice > displayPrice && displayPrice > 0 ? (
                              <Typography sx={{ color: 'var(--text-hint)', textDecoration: 'line-through', fontWeight: 700 }}>
                                ₨{originalPrice.toFixed(0)}
                              </Typography>
                            ) : (
                              <Box />
                            )}
                          </Stack>
                          {badgeText ? (
                            <Typography sx={{ color: 'var(--primary)', fontWeight: 800, mt: 0.5 }}>
                              {badgeText}
                            </Typography>
                          ) : null}
                          {!canAddToCart ? (
                            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5, fontWeight: 700 }}>
                              Available soon
                            </Typography>
                          ) : null}
                          <Button
                            fullWidth
                            variant="contained"
                            disabled={!canAddToCart}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingItem({
                                id,
                                name: title,
                                description,
                                price: displayPrice > 0 ? displayPrice : 0,
                                image: (d as any).imageUrl,
                              });
                              setPendingQty(1);
                              setPendingNote('');
                              setAddDialogOpen(true);
                            }}
                            sx={{ mt: 1.25, bgcolor: 'var(--primary)', '&:hover': { bgcolor: 'var(--primary-hover)' } }}
                          >
                            {canAddToCart ? 'Add to cart' : 'Unavailable'}
                          </Button>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        );
      })}

      {!normalizedSearch && filteredCategorySections.map((section) => (
        <Box key={section.id} sx={{ mb: 3 }}>
          {section.imageUrl ? (
            <Paper
              sx={{
                width: '100%',
                height: { xs: 170, sm: 210, md: 240 },
                borderRadius: 3,
                overflow: 'hidden',
                mb: 1.5,
                bgcolor: 'var(--bg-card)',
              }}
            >
              <Box
                component="img"
                src={normalizeMediaUrl(section.imageUrl)}
                alt={section.name}
                sx={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', display: 'block' }}
              />
            </Paper>
          ) : (
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              {section.name}
            </Typography>
          )}
          <Grid container spacing={2}>
            {section.products.map((product) => renderProductCard(product))}
          </Grid>
        </Box>
      ))}

      {!normalizedSearch && !loading && dealCampaigns.length === 0 ? (
        <Paper sx={{ p: 2, mt: 1, borderRadius: 3, border: '1px solid var(--border-color)', bgcolor: 'var(--bg-card)' }}>
          <Typography sx={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
            No active campaign deals right now.
          </Typography>
        </Paper>
      ) : null}

      {!normalizedSearch && !loading && !hasAnyProducts ? (
        <Paper sx={{ p: 2, mt: 1, borderRadius: 3, border: '1px solid var(--border-color)', bgcolor: 'var(--bg-card)' }}>
          <Typography sx={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
            No products available right now.
          </Typography>
        </Paper>
      ) : null}

      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
            {pendingItem?.name}
          </Typography>
          <IconButton onClick={() => setAddDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                {pendingItem?.image ? (
                  <Box component="img" src={normalizeMediaUrl(pendingItem.image)} alt={pendingItem.name} sx={{ width: '100%', height: 280, objectFit: 'contain', bgcolor: '#fff' }} />
                ) : (
                  <Box sx={{ width: '100%', height: 280, bgcolor: 'var(--primary-light)' }} />
                )}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              {pendingItem?.description ? (
                <Typography sx={{ color: 'var(--text-secondary)', mb: 1 }}>{pendingItem.description}</Typography>
              ) : null}
              <Typography sx={{ fontWeight: 900, color: 'var(--primary)', mb: 1 }}>
                ₨{Number(pendingItem?.price || 0).toFixed(0)}
              </Typography>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Special Instructions</Typography>
              <TextField
                placeholder="Please enter instructions about this item"
                fullWidth
                multiline
                minRows={3}
                inputProps={{ maxLength: 500 }}
                value={pendingNote}
                onChange={(e) => setPendingNote(e.target.value)}
              />
              <Typography sx={{ textAlign: 'right', color: 'var(--text-hint)', fontSize: 12 }}>
                {pendingNote.length}/500
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 1 }}>
                <IconButton onClick={() => setPendingQty((q) => Math.max(1, q - 1))}>
                  <RemoveIcon />
                </IconButton>
                <Typography sx={{ fontWeight: 900, minWidth: 28, textAlign: 'center' }}>{pendingQty}</Typography>
                <IconButton onClick={() => setPendingQty((q) => q + 1)}>
                  <AddIcon />
                </IconButton>
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            sx={{ bgcolor: 'var(--primary)', '&:hover': { bgcolor: 'var(--primary-hover)' } }}
            onClick={() => {
              if (!pendingItem) return;
              const existing = readCart();
              const normalizedNote = pendingNote.trim();
              const idx = existing.findIndex((i) => {
                const note = String((i as any).specialInstructions || '').trim();
                return i.productId === pendingItem.id && note === normalizedNote;
              });
              if (idx >= 0) {
                const next = [...existing];
                next[idx] = {
                  ...next[idx],
                  quantity: (next[idx].quantity || 0) + pendingQty,
                  specialInstructions: normalizedNote || undefined,
                };
                writeCart(next);
              } else {
                existing.push({
                  productId: pendingItem.id,
                  name: pendingItem.name,
                  price: Number(pendingItem.price || 0),
                  image: pendingItem.image,
                  quantity: pendingQty,
                  specialInstructions: normalizedNote || undefined,
                });
                writeCart(existing);
              }
              setAddDialogOpen(false);
              setTimeout(() => window.dispatchEvent(new Event('open_mini_cart')), 0);
            }}
          >
            Add to Cart
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
