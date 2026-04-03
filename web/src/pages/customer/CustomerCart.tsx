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

  const changeQty = (productId: string, delta: number) => {
    const next = items
      .map((i) => (i.productId === productId ? { ...i, quantity: (Number(i.quantity) || 0) + delta } : i))
      .filter((i) => (Number(i.quantity) || 0) > 0);
    writeCart(next);
  };

  const removeItem = (productId: string) => {
    writeCart(items.filter((i) => i.productId !== productId));
  };

  const clearCart = () => writeCart([]);

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
                <Box key={i.productId}>
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
                      <IconButton onClick={() => changeQty(i.productId, -1)} size="small">
                        <Remove />
                      </IconButton>
                      <Typography sx={{ fontWeight: 900, minWidth: 24, textAlign: 'center' }}>{i.quantity}</Typography>
                      <IconButton onClick={() => changeQty(i.productId, 1)} size="small">
                        <Add />
                      </IconButton>
                      <IconButton onClick={() => removeItem(i.productId)} size="small" color="error">
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
