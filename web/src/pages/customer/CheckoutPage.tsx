import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Radio,
  RadioGroup,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import {
  AccessTime,
  Close,
  CreditCard,
  LocalShipping,
  LocationOn,
  Storefront,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

type CartItem = {
  productId: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  specialInstructions?: string;
  cartKey?: string;
};

type LocalPlacedOrder = {
  _id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  branch?: { branchName?: string };
  orderType?: string;
  items: Array<{ product?: { name?: string }; quantity?: number }>;
};

type FormDataState = {
  fullName: string;
  email: string;
  mobileNumber: string;
  alternateNumber: string;
  deliveryAddress: string;
  nearestLandmark: string;
  deliveryInstructions: string;
  paymentMethod: 'online' | 'cod';
  cardNumber: string;
  expiryDate: string;
  cvv: string;
};

type FormErrors = Partial<Record<keyof FormDataState, string>>;

const steps = ['Delivery Address', 'Payment Method'];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [taxRate, setTaxRate] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [restaurantName, setRestaurantName] = useState('Selected Branch');
  const [branchCity, setBranchCity] = useState<string>('');
  const [branchState, setBranchState] = useState<string>('');
  const [branchZip, setBranchZip] = useState<string>('');
  const [formData, setFormData] = useState<FormDataState>({
    fullName: '',
    email: '',
    mobileNumber: '',
    alternateNumber: '',
    deliveryAddress: '',
    nearestLandmark: '',
    deliveryInstructions: '',
    paymentMethod: 'online',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [orderPlacedNumber, setOrderPlacedNumber] = useState<string | null>(null);

  const cartItems = useMemo(() => {
    try {
      const raw = localStorage.getItem('customer_cart');
      const parsed = raw ? JSON.parse(raw) : [];
      return (Array.isArray(parsed) ? parsed : []).map((item: any) => ({
        productId: String(item?.productId || ''),
        name: String(item?.name || 'Item'),
        price: Number(item?.price || 0),
        quantity: Math.max(1, Number(item?.quantity || 1)),
        image: item?.image,
        specialInstructions: item?.specialInstructions,
        cartKey: item?.cartKey,
      })) as CartItem[];
    } catch {
      return [] as CartItem[];
    }
  }, []);

  useEffect(() => {
    const selectedBranchId = localStorage.getItem('selectedBranchId');
    if (!selectedBranchId) return;
    const run = async () => {
      try {
        const res: any = await api.get(`/restaurants/${selectedBranchId}`);
        const data = res?.data || {};
        setTaxRate(Number(data?.taxRate || 0));
        setDeliveryFee(Number(data?.deliveryFee || 0));
        setRestaurantName(String(data?.branchName || data?.name || data?.restaurantName || 'Selected Branch'));
        const detectedCity = String(data?.city || data?.location?.city || '').trim();
        if (detectedCity) setBranchCity(detectedCity);
        const detectedState = String(data?.state || data?.location?.state || '').trim();
        if (detectedState) setBranchState(detectedState);
        const detectedZip = String(data?.zipCode || data?.location?.zipCode || '').trim();
        if (detectedZip) setBranchZip(detectedZip);
      } catch {
        setTaxRate(0);
        setDeliveryFee(0);
      }
    };
    run();
  }, []);

  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0), [cartItems]);
  const taxAmount = useMemo(() => (subtotal * Number(taxRate || 0)) / 100, [subtotal, taxRate]);
  const total = useMemo(() => Math.max(0, subtotal + taxAmount + Number(deliveryFee || 0)), [subtotal, taxAmount, deliveryFee]);

  const handleInputChange = (field: keyof FormDataState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (stepIndex: number) => {
    const nextErrors: FormErrors = {};
    if (stepIndex === 0) {
      if (!formData.fullName.trim()) nextErrors.fullName = 'Full name is required';
      if (!formData.email.trim()) nextErrors.email = 'Email is required';
      if (!formData.mobileNumber.trim()) nextErrors.mobileNumber = 'Mobile number is required';
      if (!formData.deliveryAddress.trim()) nextErrors.deliveryAddress = 'Delivery address is required';
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) nextErrors.email = 'Enter a valid email address';
    }
    if (stepIndex === 1 && formData.paymentMethod === 'online') {
      if (!formData.cardNumber.trim()) nextErrors.cardNumber = 'Card number is required';
      if (!formData.expiryDate.trim()) nextErrors.expiryDate = 'Expiry date is required';
      if (!formData.cvv.trim()) nextErrors.cvv = 'CVV is required';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handlePlaceOrder = async () => {
    setSubmitError('');
    if (!validateStep(0) || !validateStep(1)) {
      setActiveStep(0);
      return;
    }
    if (cartItems.length === 0) {
      setSubmitError('Your cart is empty. Add items before placing order.');
      return;
    }
    const authToken = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
    const storedUserRole = String(localStorage.getItem('userRole') || '').trim().toUpperCase();
    const selectedBranchId = localStorage.getItem('selectedBranchId');
    if (!selectedBranchId || selectedBranchId === 'all') {
      setSubmitError('Please select a branch before placing your order.');
      navigate('/customer/menu');
      return;
    }
    const invalidItem = cartItems.find((item) => !String(item.productId || (item as any).id || (item as any)._id || '').trim());
    if (invalidItem) {
      setSubmitError('One or more cart items are invalid. Please re-add them from menu.');
      return;
    }
    setLoading(true);
    try {
      let fallbackName = formData.fullName.trim();
      let effectiveUserRole = storedUserRole;
      if (!fallbackName) {
        try {
          const rawUser = localStorage.getItem('userData');
          const parsedUser = rawUser ? JSON.parse(rawUser) : null;
          fallbackName = String(parsedUser?.displayName || parsedUser?.name || parsedUser?.display_name || '').trim();
          if (!effectiveUserRole) {
            effectiveUserRole = String(parsedUser?.role || '').trim().toUpperCase();
          }
        } catch {
          fallbackName = '';
        }
      }

      const deliveryInstructions = (formData.deliveryInstructions || formData.nearestLandmark || '').trim();
      const specialInstructions = (formData.deliveryInstructions || '').trim();
      const phoneNumber = formData.mobileNumber.trim();
      const alternatePhoneNumber = formData.alternateNumber.trim();
      const street = formData.deliveryAddress.trim();

      const payload = {
        restaurantId: selectedBranchId,
        customerName: fallbackName || 'Customer',
        orderType: 'DELIVERY',
        paymentMethod: formData.paymentMethod === 'cod' ? 'cash' : 'card',
        phoneNumber,
        alternatePhoneNumber,
        deliveryAddress: {
          street,
          city: branchCity || 'City',
          state: branchState || 'State',
          zipCode: branchZip || '00000',
        },
        items: cartItems.map((item) => ({
          menuItemId: String(item.productId || (item as any).id || (item as any)._id || ''),
          quantity: Math.max(1, Number(item.quantity || 1)),
          customizations: [],
        })),
        ...(deliveryInstructions ? { deliveryInstructions } : {}),
        ...(specialInstructions ? { specialInstructions } : {}),
      };

      const canPlaceAuthenticatedOrder = !!authToken && ['CUSTOMER', 'WAITER'].includes(effectiveUserRole);
      const orderRes: any = canPlaceAuthenticatedOrder
        ? await api.post('/orders', payload)
        : await api.post('/orders/guest', payload);
      if (!orderRes?.success) {
        throw new Error(orderRes?.error || orderRes?.message || 'Order placement failed');
      }
      const createdOrder = orderRes?.data || {};

      const snapshot: LocalPlacedOrder = {
        _id: String(createdOrder?._id || `LOCAL-${Date.now()}`),
        orderNumber: String(createdOrder?.orderNumber || `ORD-${String(Date.now()).slice(-6)}`),
        totalAmount: Number(createdOrder?.totalAmount || createdOrder?.finalAmount || total || 0),
        status: String(createdOrder?.status || 'PENDING'),
        createdAt: String(createdOrder?.createdAt || new Date().toISOString()),
        branch: { branchName: String(createdOrder?.branch?.branchName || restaurantName || 'Selected Branch') },
        orderType: String(createdOrder?.orderType || 'DELIVERY'),
        items: Array.isArray(createdOrder?.items) && createdOrder.items.length > 0
          ? createdOrder.items.map((item: any) => ({
              product: { name: String(item?.productName || item?.product?.name || 'Item') },
              quantity: Number(item?.quantity || 1),
            }))
          : cartItems.map((item) => ({
              product: { name: item.name },
              quantity: item.quantity,
            })),
      };
      const prevOrdersRaw = localStorage.getItem('customer_guest_orders');
      const prevOrders = prevOrdersRaw ? JSON.parse(prevOrdersRaw) : [];
      const nextOrders = Array.isArray(prevOrders) ? [snapshot, ...prevOrders].slice(0, 10) : [snapshot];
      localStorage.setItem('customer_guest_orders', JSON.stringify(nextOrders));
      localStorage.setItem('customer_latest_order', JSON.stringify(snapshot));
      localStorage.setItem('order_success_msg', `Order ${snapshot.orderNumber} placed successfully`);
      setOrderPlacedNumber(snapshot.orderNumber);
      localStorage.removeItem('customer_cart');
      window.dispatchEvent(new Event('customer_cart_updated'));
      setTimeout(() => navigate('/customer/orders'), 800);
    } catch (error: any) {
      setSubmitError(error?.message || 'Unable to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ py: { xs: 1.5, md: 2.5 } }}>
      <Card sx={{ borderRadius: 4, border: '1px solid #ececec', boxShadow: '0 16px 34px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 1.5, md: 2 }, borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: 22, md: 28 }, color: '#111' }}>Checkout</Typography>
          <IconButton onClick={() => navigate('/customer')} sx={{ color: '#666' }}>
            <Close />
          </IconButton>
        </Box>

        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Card sx={{ borderRadius: 3, border: '1px solid #ececec', boxShadow: 'none', mb: 2 }}>
                <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                  <Stepper activeStep={activeStep} alternativeLabel sx={{ '& .MuiStepLabel-label': { fontWeight: 700, fontSize: 12 } }}>
                    {steps.map((label) => (
                      <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                </CardContent>
              </Card>

              <Stack spacing={2}>
                <Card sx={{ borderRadius: 3, border: activeStep === 0 ? '1px solid #E55A2B' : '1px solid #ececec', boxShadow: 'none' }}>
                  <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                      <LocationOn sx={{ color: '#E55A2B' }} />
                      <Typography sx={{ fontWeight: 800, fontSize: 18 }}>Delivery Address</Typography>
                    </Stack>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth placeholder="Full Name" value={formData.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} error={Boolean(errors.fullName)} helperText={errors.fullName} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth placeholder="Email Address" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} error={Boolean(errors.email)} helperText={errors.email} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth placeholder="Mobile Number" value={formData.mobileNumber} onChange={(e) => handleInputChange('mobileNumber', e.target.value)} error={Boolean(errors.mobileNumber)} helperText={errors.mobileNumber} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth placeholder="Alternate Number" value={formData.alternateNumber} onChange={(e) => handleInputChange('alternateNumber', e.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField fullWidth placeholder="Delivery Address" value={formData.deliveryAddress} onChange={(e) => handleInputChange('deliveryAddress', e.target.value)} error={Boolean(errors.deliveryAddress)} helperText={errors.deliveryAddress} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth placeholder="Nearest Landmark" value={formData.nearestLandmark} onChange={(e) => handleInputChange('nearestLandmark', e.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth placeholder="Delivery Instructions" value={formData.deliveryInstructions} onChange={(e) => handleInputChange('deliveryInstructions', e.target.value)} />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                <Card sx={{ borderRadius: 3, border: activeStep === 1 ? '1px solid #E55A2B' : '1px solid #ececec', boxShadow: 'none' }}>
                  <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                      <CreditCard sx={{ color: '#E55A2B' }} />
                      <Typography sx={{ fontWeight: 800, fontSize: 18 }}>Payment Method</Typography>
                    </Stack>
                    <RadioGroup value={formData.paymentMethod} onChange={(e) => handleInputChange('paymentMethod', e.target.value as 'online' | 'cod')}>
                      <FormControlLabel value="online" control={<Radio sx={{ color: '#E55A2B', '&.Mui-checked': { color: '#E55A2B' } }} />} label="Online Payment" />
                      <FormControlLabel value="cod" control={<Radio sx={{ color: '#E55A2B', '&.Mui-checked': { color: '#E55A2B' } }} />} label="Cash on Delivery" />
                    </RadioGroup>
                    {formData.paymentMethod === 'online' ? (
                      <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                        <Grid size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            placeholder="Card Number"
                            value={formData.cardNumber}
                            onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                            error={Boolean(errors.cardNumber)}
                            helperText={errors.cardNumber}
                            InputProps={{ startAdornment: <InputAdornment position="start"><CreditCard sx={{ fontSize: 18, color: '#888' }} /></InputAdornment> }}
                          />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <TextField fullWidth placeholder="MM/YY" value={formData.expiryDate} onChange={(e) => handleInputChange('expiryDate', e.target.value)} error={Boolean(errors.expiryDate)} helperText={errors.expiryDate} />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <TextField fullWidth placeholder="CVV" value={formData.cvv} onChange={(e) => handleInputChange('cvv', e.target.value)} error={Boolean(errors.cvv)} helperText={errors.cvv} />
                        </Grid>
                      </Grid>
                    ) : null}
                  </CardContent>
                </Card>

                {/* Promo section removed as requested */}
              </Stack>

            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ borderRadius: 3.5, border: '1px solid #ececec', boxShadow: '0 10px 20px rgba(0,0,0,0.05)', position: { md: 'sticky' }, top: { md: 90 } }}>
                <CardContent sx={{ p: { xs: 2, md: 2.2 } }}>
                  <Typography sx={{ fontWeight: 900, fontSize: 30, lineHeight: 1.1, mb: 1.2 }}>Order Summary</Typography>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.6 }}>
                    <Storefront sx={{ color: '#E55A2B' }} />
                    <Typography sx={{ fontWeight: 800, color: '#1f1f1f' }}>{restaurantName}</Typography>
                  </Stack>
                  <Stack spacing={1} sx={{ mb: 1.6, maxHeight: 210, overflowY: 'auto', pr: 0.5 }}>
                    {cartItems.map((item) => (
                      <Stack key={item.cartKey || `${item.productId}-${item.name}`} direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                        <Typography sx={{ color: '#303030', fontWeight: 600, fontSize: 14 }}>
                          {item.name} x{item.quantity}
                        </Typography>
                        <Typography sx={{ color: '#101010', fontWeight: 700, fontSize: 14 }}>Rs. {(item.price * item.quantity).toFixed(0)}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                  <Divider />
                  <Stack spacing={1} sx={{ mt: 1.4 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography sx={{ color: '#555', fontWeight: 600 }}>Subtotal</Typography>
                      <Typography sx={{ color: '#121212', fontWeight: 700 }}>Rs. {subtotal.toFixed(0)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography sx={{ color: '#555', fontWeight: 600 }}>Delivery</Typography>
                      <Typography sx={{ color: '#121212', fontWeight: 700 }}>Rs. {Number(deliveryFee || 0).toFixed(0)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography sx={{ color: '#555', fontWeight: 600 }}>Tax {Number(taxRate || 0).toFixed(0)}%</Typography>
                      <Typography sx={{ color: '#121212', fontWeight: 700 }}>Rs. {taxAmount.toFixed(0)}</Typography>
                    </Stack>
                    <Divider />
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
                      <Typography sx={{ color: '#111', fontWeight: 900, fontSize: 28, lineHeight: 1 }}>TOTAL</Typography>
                      <Typography sx={{ color: '#111', fontWeight: 900, fontSize: 38, lineHeight: 1 }}>Rs. {total.toFixed(0)}</Typography>
                    </Stack>
                  </Stack>

                  <PaperInfo>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AccessTime sx={{ color: '#2f6fce', fontSize: 20 }} />
                      <Typography sx={{ color: '#18335f', fontWeight: 700, fontSize: 13 }}>Estimated delivery: 45 minutes</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.8 }}>
                      <LocalShipping sx={{ color: '#2f6fce', fontSize: 20 }} />
                      <Typography sx={{ color: '#18335f', fontWeight: 700, fontSize: 13 }}>Fast and contact-safe delivery</Typography>
                    </Stack>
                  </PaperInfo>

                  {orderPlacedNumber ? <Alert sx={{ mt: 1.2 }} severity="success">{`Order placed successfully: ${orderPlacedNumber}`}</Alert> : null}
                  {submitError ? <Alert sx={{ mt: 1.2 }} severity="error">{submitError}</Alert> : null}

                  <Button
                    fullWidth
                    variant="contained"
                    disabled={loading || cartItems.length === 0}
                    onClick={handlePlaceOrder}
                    sx={{ mt: 1.6, bgcolor: '#E55A2B', borderRadius: 999, py: 1.35, fontWeight: 900, fontSize: 18, '&:hover': { bgcolor: '#cc4f24' } }}
                  >
                    {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'PLACE ORDER'}
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => navigate('/customer')}
                    sx={{ mt: 1, borderColor: '#E55A2B', color: '#E55A2B', borderRadius: 999, py: 1.1, fontWeight: 800 }}
                  >
                    Continue Shopping
                  </Button>
                  {cartItems.length === 0 ? <Alert sx={{ mt: 1.2 }} severity="warning">Your cart is empty. Add items to continue.</Alert> : null}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}

function PaperInfo({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ mt: 1.4, p: 1.1, borderRadius: 2, bgcolor: '#f3f8ff', border: '1px solid #deebff' }}>
      {children}
    </Box>
  );
}
