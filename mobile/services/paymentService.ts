import { api } from '../components/api/client';

/**
 * Payment method types
 */
export type PaymentMethod = 'card' | 'cash' | 'wallet' | 'apple_pay' | 'google_pay';

/**
 * Payment intent response
 */
export interface PaymentIntentResponse {
  success: boolean;
  clientSecret?: string;
  intentId?: string;
  error?: string;
}

/**
 * Payment confirmation response
 */
export interface PaymentConfirmationResponse {
  success: boolean;
  payment?: any;
  order?: any;
  error?: string;
}

/**
 * Payout response
 */
export interface PayoutResponse {
  success: boolean;
  payouts?: any[];
  totalEarnings?: number;
  payout?: any;
  error?: string;
}

/**
 * Earnings response
 */
export interface EarningsResponse {
  success: boolean;
  earnings?: {
    today: number;
    week: number;
    total: number;
    pending: number;
    completedDeliveries: number;
  };
  error?: string;
}

/**
 * Admin payments response
 */
export interface AdminPaymentsResponse {
  success: boolean;
  payments?: any[];
  stats?: any[];
  error?: string;
}

// ============================================
// CUSTOMER PAYMENT METHODS
// ============================================

/**
 * CREATE PAYMENT INTENT FOR ORDER
 * Used to initialize Stripe card payment
 */
export const createPaymentIntent = async (
  orderId: string,
  amount: number,
  currency: string = 'usd'
): Promise<PaymentIntentResponse> => {
  try {
    console.log('[Payment Service] Creating intent:', { orderId, amount, currency });
    
    const response = await api.post('/payments/create-payment-intent', {
      orderId,
      amount,
      currency
    });
    
    console.log('[Payment Service] Intent created:', response.data);
    
    return {
      success: true,
      clientSecret: response.data.clientSecret,
      intentId: response.data.intentId
    };
    
  } catch (error: any) {
    console.error('[Payment Service] Create intent error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

/**
 * CONFIRM PAYMENT
 * Called after successful Stripe payment
 */
export const confirmPayment = async (
  orderId: string,
  paymentIntentId: string,
  paymentMethod: PaymentMethod,
  amount: number
): Promise<PaymentConfirmationResponse> => {
  try {
    console.log('[Payment Service] Confirming payment:', paymentIntentId);
    
    const response = await api.post('/payments/confirm-payment', {
      orderId,
      paymentIntentId,
      paymentMethod,
      amount
    });
    
    console.log('[Payment Service] Payment confirmed:', response.data);
    
    return {
      success: true,
      order: response.data.order,
      payment: response.data.payment
    };
    
  } catch (error: any) {
    console.error('[Payment Service] Confirm error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

/**
 * MARK AS CASH ON DELIVERY
 * For orders that will be paid in cash
 */
export const markCashPayment = async (
  orderId: string,
  amount: number
): Promise<PaymentConfirmationResponse> => {
  try {
    console.log('[Payment Service] Marking as cash:', orderId);
    
    const response = await api.post('/payments/mark-cash-payment', {
      orderId,
      amount
    });
    
    return {
      success: true,
      order: response.data.order,
      payment: response.data.payment
    };
    
  } catch (error: any) {
    console.error('[Payment Service] Cash payment error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

/**
 * CONFIRM CASH PAYMENT RECEIVED
 * Called by rider when they collect cash
 */
export const confirmCashPayment = async (
  paymentId: string
): Promise<PaymentConfirmationResponse> => {
  try {
    const response = await api.post(`/payments/confirm-cash/${paymentId}`);
    
    return {
      success: true,
      payment: response.data.payment
    };
    
  } catch (error: any) {
    console.error('[Payment Service] Confirm cash error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

// ============================================
// RIDER PAYOUT METHODS
// ============================================

/**
 * GET RIDER PAYOUTS
 * Get payout history for rider
 */
export const getRiderPayouts = async (): Promise<PayoutResponse> => {
  try {
    const response = await api.get('/payments/rider/payouts');
    
    return {
      success: true,
      payouts: response.data.payouts,
      totalEarnings: response.data.totalEarnings
    };
    
  } catch (error: any) {
    console.error('[Payment Service] Get payouts error:', error);
    return {
      success: false,
      payouts: [],
      totalEarnings: 0
    };
  }
};

/**
 * GET RIDER EARNINGS
 * Get earnings summary for rider
 */
export const getRiderEarnings = async (): Promise<EarningsResponse> => {
  try {
    const response = await api.get('/payments/rider/earnings');
    
    return {
      success: true,
      earnings: response.data.earnings
    };
    
  } catch (error: any) {
    console.error('[Payment Service] Get earnings error:', error);
    return {
      success: false
    };
  }
};

/**
 * REQUEST RIDER PAYOUT
 * Rider requests withdrawal
 */
export const requestRiderPayout = async (
  amount: number,
  bankAccountId: string
): Promise<PayoutResponse> => {
  try {
    const response = await api.post('/payments/rider/request-payout', {
      amount,
      bankAccountId
    });
    
    return {
      success: true,
      payout: response.data.payout
    };
    
  } catch (error: any) {
    console.error('[Payment Service] Request payout error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

// ============================================
// ADMIN PAYMENT METHODS
// ============================================

/**
 * GET ADMIN PAYMENTS
 * Get all payments for admin dashboard
 */
export const getAdminPayments = async (
  status?: string,
  method?: string,
  type?: string,
  limit: number = 50
): Promise<AdminPaymentsResponse> => {
  try {
    // Build query string
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (method) params.append('method', method);
    if (type) params.append('type', type);
    params.append('limit', limit.toString());
    
    const queryString = params.toString();
    const url = `/payments/admin/payments${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    
    return {
      success: true,
      payments: response.data?.payments,
      stats: response.data?.stats
    };
    
  } catch (error: any) {
    console.error('[Payment Service] Get payments error:', error);
    return {
      success: false,
      payments: []
    };
  }
};

/**
 * GET ADMIN PAYMENT STATS
 * Get payment statistics for dashboard
 */
export const getAdminPaymentStats = async (): Promise<AdminPaymentsResponse> => {
  try {
    const response = await api.get('/payments/admin/stats');
    
    return {
      success: true,
      stats: response.data.stats
    };
    
  } catch (error: any) {
    console.error('[Payment Service] Get stats error:', error);
    return {
      success: false
    };
  }
};

/**
 * APPROVE PAYOUT
 * Admin approves rider payout request
 */
export const approvePayout = async (
  payoutId: string
): Promise<PayoutResponse> => {
  try {
    const response = await api.post(`/payments/admin/approve-payout/${payoutId}`);
    
    return {
      success: true,
      payout: response.data.payout
    };
    
  } catch (error: any) {
    console.error('[Payment Service] Approve payout error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

/**
 * REJECT PAYOUT
 * Admin rejects rider payout request
 */
export const rejectPayout = async (
  payoutId: string,
  reason: string
): Promise<PayoutResponse> => {
  try {
    const response = await api.post(`/payments/admin/reject-payout/${payoutId}`, {
      reason
    });
    
    return {
      success: true,
      payout: response.data.payout
    };
    
  } catch (error: any) {
    console.error('[Payment Service] Reject payout error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

/**
 * PROCESS REFUND
 * Admin processes refund for order
 */
export const processRefund = async (
  paymentId: string,
  amount?: number,
  reason?: string
): Promise<PaymentConfirmationResponse> => {
  try {
    const response = await api.post(`/payments/refund/${paymentId}`, {
      amount,
      reason
    });
    
    return {
      success: true,
      payment: response.data.payment
    };
    
  } catch (error: any) {
    console.error('[Payment Service] Refund error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};
