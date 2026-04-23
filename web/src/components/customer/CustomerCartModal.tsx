import type { Dispatch, SetStateAction } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Add, ArrowForward, CheckCircle, Close, Delete, Remove, ShoppingBag } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

type CartItem = {
  productId: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  specialInstructions?: string;
  cartKey: string;
};

export default function CustomerCartModal({
  open,
  onClose,
  checkoutOpen,
  setCheckoutOpen,
  checkoutName,
  setCheckoutName,
  checkoutEmail,
  setCheckoutEmail,
  checkoutPhone,
  setCheckoutPhone,
  checkoutAltPhone,
  setCheckoutAltPhone,
  checkoutAddress,
  setCheckoutAddress,
  checkoutLandmark,
  setCheckoutLandmark,
  deliveryInstructions,
  setDeliveryInstructions,
  visibleCartItems,
  taxRate,
  deliveryFee,
  cartSubtotal,
  taxAmount,
  grandTotal,
  clearCart,
  changeQty,
  removeItem,
}: {
  open: boolean;
  onClose: () => void;
  checkoutOpen: boolean;
  setCheckoutOpen: Dispatch<SetStateAction<boolean>>;
  checkoutName: string;
  setCheckoutName: Dispatch<SetStateAction<string>>;
  checkoutEmail: string;
  setCheckoutEmail: Dispatch<SetStateAction<string>>;
  checkoutPhone: string;
  setCheckoutPhone: Dispatch<SetStateAction<string>>;
  checkoutAltPhone: string;
  setCheckoutAltPhone: Dispatch<SetStateAction<string>>;
  checkoutAddress: string;
  setCheckoutAddress: Dispatch<SetStateAction<string>>;
  checkoutLandmark: string;
  setCheckoutLandmark: Dispatch<SetStateAction<string>>;
  deliveryInstructions: string;
  setDeliveryInstructions: Dispatch<SetStateAction<string>>;
  visibleCartItems: CartItem[];
  taxRate: number;
  deliveryFee: number;
  cartSubtotal: number;
  taxAmount: number;
  grandTotal: number;
  clearCart: () => void;
  changeQty: (cartKey: string, delta: number) => void;
  removeItem: (cartKey: string) => void;
}) {
  const navigate = useNavigate();
  const handleClose = () => {
    setCheckoutOpen(false);
    onClose();
  };

  const emptyState = (
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
          handleClose();
          navigate('/customer');
        }}
      >
        Browse Products
      </Button>
    </Box>
  );
  const selectedItemsView = (
    <Box sx={{ pb: 0, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Paper
        sx={{
          border: 'none',
          borderRadius: 0,
          boxShadow: 'none',
          overflow: 'visible',
          mb: 1.5,
          bgcolor: 'transparent',
        }}
      >
        <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 800 }}>Selected items ({visibleCartItems.length})</Typography>
          <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-end', sm: 'flex-start' } }}>
            <Button size="small" onClick={handleClose} sx={{ textTransform: 'none' }}>Add more items</Button>
            <Button size="small" color="error" onClick={clearCart} sx={{ textTransform: 'none' }}>Clear</Button>
          </Stack>
        </Box>
        <Divider />
        <Box sx={{ p: 1 }}>
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

      <Paper sx={{ border: 'none', borderRadius: 0, boxShadow: 'none', bgcolor: 'transparent', p: 1.5, mt: 'auto' }}>
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
            handleClose();
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
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
          onClick={handleClose}
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
                      onClose();
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
          emptyState
        ) : (
          selectedItemsView
        )}
      </DialogContent>
    </Dialog>
  );
}
