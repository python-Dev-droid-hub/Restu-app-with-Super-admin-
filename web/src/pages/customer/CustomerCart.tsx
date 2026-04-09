import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Divider, IconButton, Paper, Stack, Typography } from '@mui/material';
import { Add, Remove, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

type CartItem = {
  productId: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  cartKey: string;
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
    const note = String(item?.specialInstructions || item?.note || '').trim();
    const quantity = Number(item?.quantity ?? item?.qty ?? item?.count ?? item?.itemQty ?? item?.productQuantity ?? item?.product?.quantity ?? 1);
    if (!quantity || quantity <= 0) continue;
    const fallbackKey = String(item?.name || item?.title || item?.productName || item?.product?.name || 'item').trim().toLowerCase();
    const cartKey = `${productId || fallbackKey}::${note}`;
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
      cartKey,
    });
  }
  return Array.from(aggregated.values());
};

const readCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem('customer_cart');
    if (!raw) return [];
    return normalizeCartItems(JSON.parse(raw));
  } catch {
    return [];
  }
};

const writeCart = (items: CartItem[]) => {
  const normalized = items.map((item) => {
    const next = { ...item } as any;
    delete next.cartKey;
    return next;
  });
  localStorage.setItem('customer_cart', JSON.stringify(normalized));
  window.dispatchEvent(new Event('customer_cart_updated'));
};

export default function CustomerCart() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const update = () => setItems(readCart());
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

  const total = useMemo(() => items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0), [items]);

  const changeQty = (cartKey: string, delta: number) => {
    const next = items
      .map((i) => (i.cartKey === cartKey ? { ...i, quantity: (Number(i.quantity) || 0) + delta } : i))
      .filter((i) => (Number(i.quantity) || 0) > 0);
    writeCart(next);
    setItems(next);
  };

  const removeItem = (cartKey: string) => {
    const next = items.filter((i) => i.cartKey !== cartKey);
    writeCart(next);
    setItems(next);
  };

  const clearCart = () => {
    writeCart([]);
    setItems([]);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, color: 'var(--text-primary)' }}>
              Cart
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
              {items.length} item{items.length === 1 ? '' : 's'}
            </Typography>
          </Box>
          {items.length > 0 ? (
            <Button variant="outlined" onClick={clearCart}>
              Clear
            </Button>
          ) : null}
        </Stack>
      </Paper>

      {items.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid var(--border-color)' }}>
          <Typography sx={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Your cart is empty.</Typography>
        </Paper>
      ) : (
        <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <Stack spacing={2}>
            {items.map((i) => {
              const img = api.getImageUrl(i.image);
              return (
                <Box key={i.cartKey}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {img ? (
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: 2,
                          border: '1px solid var(--border-color)',
                          backgroundImage: `url(${img})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          flex: '0 0 auto',
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: 2,
                          border: '1px solid var(--border-color)',
                          bgcolor: 'var(--primary-light)',
                          flex: '0 0 auto',
                        }}
                      />
                    )}

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900, color: 'var(--text-primary)' }} noWrap>
                        {i.name}
                      </Typography>
                      <Typography sx={{ color: 'var(--primary)', fontWeight: 900 }}>
                        ₨{Number(i.price || 0).toFixed(0)}
                      </Typography>
                    </Box>

                    <Stack direction="row" alignItems="center" spacing={1}>
                      <IconButton onClick={() => changeQty(i.cartKey, -1)} size="small">
                        <Remove />
                      </IconButton>
                      <Typography sx={{ fontWeight: 900, minWidth: 24, textAlign: 'center' }}>{i.quantity}</Typography>
                      <IconButton onClick={() => changeQty(i.cartKey, 1)} size="small">
                        <Add />
                      </IconButton>
                      <IconButton onClick={() => removeItem(i.cartKey)} size="small" color="error">
                        <Delete />
                      </IconButton>
                    </Stack>
                  </Stack>
                  <Divider sx={{ mt: 2 }} />
                </Box>
              );
            })}
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }} alignItems="center" justifyContent="space-between">
            <Typography sx={{ fontWeight: 900, fontSize: 18 }}>
              Total: <span style={{ color: 'var(--primary)' }}>₨{Number(total).toFixed(0)}</span>
            </Typography>
            <Button
              variant="contained"
              sx={{ bgcolor: 'var(--primary)', '&:hover': { bgcolor: 'var(--primary-hover)' }, minWidth: 200 }}
              onClick={() => navigate('/customer/checkout')}
            >
              Checkout
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
