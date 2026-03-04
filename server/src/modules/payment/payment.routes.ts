import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { Payment } from '../../models/Payment';
import { Order } from '../../models/Order';
import { User } from '../../models/User';
import { authenticate, authorize } from '../../middleware/auth';
import { IAuthRequest } from '../../types';

const router = Router();

// Initialize Stripe
// NOTE: Stripe's type definitions constrain apiVersion; we omit it and let the library default.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_your_key_here');

// ============================================
// CUSTOMER PAYMENT PROCESSING
// ============================================

/**
 * Create payment intent for order
 * Used by frontend to collect card details
 */
router.post('/create-payment-intent', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const { orderId, amount, currency = 'usd' } = req.body;
    
    console.log('[Payment] Creating intent for order:', orderId);
    console.log('[Payment] Amount:', amount, currency);
    
    // Validate order exists and belongs to customer
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    if (order.customer?.toString() !== req.user?._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency,
      metadata: {
        orderId: orderId,
        customerId: req.user._id.toString(),
        orderNumber: order.orderNumber || ''
      },
      description: `Order ${order.orderNumber}` 
    });
    
    console.log('[Payment] Intent created:', paymentIntent.id);
    
    return res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      intentId: paymentIntent.id
    });
    
  } catch (error: any) {
    console.error('[Payment] Create intent error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Confirm payment and save to database
 */
router.post('/confirm-payment', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const { orderId, paymentIntentId, paymentMethod, amount } = req.body;
    
    console.log('[Payment] Confirming payment:', paymentIntentId);
    
    // Get payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not successful'
      });
    }
    
    // Check if payment already exists
    const existingPayment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
    if (existingPayment) {
      return res.json({
        success: true,
        message: 'Payment already confirmed',
        payment: existingPayment
      });
    }
    
    // Create payment record
    const payment = new Payment({
      order: orderId,
      customer: req.user?._id,
      amount: amount,
      currency: paymentIntent.currency,
      paymentMethod: paymentMethod || 'card',
      status: 'SUCCESS',
      stripePaymentIntentId: paymentIntentId,
      transactionId: paymentIntent.id,
      completedAt: new Date()
    });
    
    await payment.save();
    
    // Update order payment status
    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: 'paid',
      paymentMethod: paymentMethod || 'card',
      paymentDate: new Date(),
      stripePaymentIntentId: paymentIntentId,
      status: 'CONFIRMED'
    });
    
    console.log('[Payment] Payment confirmed:', payment._id);
    
    return res.json({
      success: true,
      message: 'Payment successful',
      payment: payment
    });
    
  } catch (error: any) {
    console.error('[Payment] Confirm payment error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Handle payment webhook from Stripe
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
    
    console.log('[Webhook] Event received:', event.type);
    
    switch(event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('[Webhook] Payment succeeded:', paymentIntent.id);
        
        // Update payment status
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          { status: 'SUCCESS', completedAt: new Date() }
        );
        
        // Update order status
        await Order.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          { paymentStatus: 'paid', status: 'CONFIRMED' }
        );
        break;
        
      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object as Stripe.PaymentIntent;
        console.log('[Webhook] Payment failed:', failedIntent.id);
        
        // Update payment status
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: failedIntent.id },
          { status: 'FAILED', failureReason: 'Payment failed' }
        );
        
        // Update order status
        await Order.findOneAndUpdate(
          { stripePaymentIntentId: failedIntent.id },
          { paymentStatus: 'failed' }
        );
        break;
    }
    
    res.json({ received: true });
    
  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// ============================================
// CASH ON DELIVERY
// ============================================

/**
 * Mark order as cash payment
 */
router.post('/mark-cash-payment', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const { orderId, amount } = req.body;
    
    console.log('[Payment] Marking as cash:', orderId);
    
    // Check if payment already exists
    const existingPayment = await Payment.findOne({ order: orderId });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Payment already exists for this order'
      });
    }
    
    // Create payment record
    const payment = new Payment({
      order: orderId,
      customer: req.user?._id,
      amount: amount,
      paymentMethod: 'cash',
      status: 'PENDING' // Will be confirmed when rider delivers
    });
    
    await payment.save();
    
    // Update order
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        paymentMethod: 'cash',
        paymentStatus: 'pending',
        status: 'CONFIRMED'
      },
      { new: true }
    );
    
    return res.json({
      success: true,
      message: 'Order confirmed. Pay at delivery.',
      order: order,
      payment: payment
    });
    
  } catch (error: any) {
    console.error('[Payment] Cash payment error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Confirm cash payment (Rider confirms payment received)
 */
router.post('/confirm-cash/:paymentId', authenticate, authorize('RIDER', 'ADMIN', 'SUPER_ADMIN'), async (req: IAuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      {
        status: 'SUCCESS',
        completedAt: new Date()
      },
      { new: true }
    );
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Update order
    await Order.findByIdAndUpdate(payment.order, {
      paymentStatus: 'paid',
      paymentDate: new Date()
    });
    
    return res.json({
      success: true,
      message: 'Cash payment confirmed',
      payment: payment
    });
    
  } catch (error: any) {
    console.error('[Payment] Confirm cash error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// RIDER PAYOUTS
// ============================================

/**
 * Get rider payout history
 */
router.get('/rider/payouts', authenticate, authorize('RIDER', 'SUPER_ADMIN'), async (req: IAuthRequest, res: Response) => {
  try {
    const riderId = req.user?._id;
    
    console.log('[Payout] Getting payouts for rider:', riderId);
    
    const payouts = await Payment.find({
      rider: riderId,
      type: 'payout'
    })
      .populate('order', 'orderNumber totalAmount')
      .sort({ createdAt: -1 })
      .limit(50);
    
    // Calculate total
    const totalEarnings = payouts.reduce((sum, p) => sum + p.amount, 0);
    
    return res.json({
      success: true,
      payouts: payouts,
      totalEarnings: totalEarnings
    });
    
  } catch (error: any) {
    console.error('[Payout] Get payouts error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Request payout (rider requests withdrawal)
 */
router.post('/rider/request-payout', authenticate, authorize('RIDER'), async (req: IAuthRequest, res: Response) => {
  try {
    const { amount, bankAccountId } = req.body;
    const riderId = req.user?._id;
    
    console.log('[Payout] Request payout:', { riderId, amount });
    
    // Verify rider has sufficient payout balance
    // NOTE: IUser does not currently expose walletBalance in this codebase.
    // We use payoutBalance (optional) if present; otherwise treat as 0.
    const rider: any = await User.findById(riderId);
    const payoutBalance = Number(rider?.payoutBalance || 0);
    if (!rider || payoutBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }
    
    // Create payout
    const payout = new Payment({
      // For payouts, we do not attach an order/customer
      rider: riderId,
      amount: amount,
      paymentMethod: 'bank_transfer',
      type: 'payout',
      status: 'PENDING',
      bankAccountId: bankAccountId
    });
    
    await payout.save();
    
    // Deduct from payout balance
    await User.findByIdAndUpdate(riderId, { $inc: { payoutBalance: -amount } });
    
    console.log('[Payout] Payout created:', payout._id);
    
    return res.json({
      success: true,
      message: 'Payout request submitted',
      payout: payout
    });
    
  } catch (error: any) {
    console.error('[Payout] Request payout error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get rider earnings summary
 */
router.get('/rider/earnings', authenticate, authorize('RIDER'), async (req: IAuthRequest, res: Response) => {
  try {
    const riderId = req.user?._id;
    
    // Get completed deliveries with earnings
    const completedOrders = await Order.find({
      driver: riderId,
      status: 'DELIVERED',
      paymentStatus: 'paid'
    });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const todayEarnings = completedOrders
      .filter(o => o.createdAt && new Date(o.createdAt) >= today)
      .reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
    
    const weekEarnings = completedOrders
      .filter(o => o.createdAt && new Date(o.createdAt) >= weekAgo)
      .reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
    
    const totalEarnings = completedOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
    
    // Get pending payouts
    const pendingPayouts = await Payment.find({
      rider: riderId,
      type: 'payout',
      status: 'PENDING'
    });
    
    const pendingAmount = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);
    
    return res.json({
      success: true,
      earnings: {
        today: todayEarnings,
        week: weekEarnings,
        total: totalEarnings,
        pending: pendingAmount,
        completedDeliveries: completedOrders.length
      }
    });
    
  } catch (error: any) {
    console.error('[Payout] Get earnings error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// ADMIN PAYMENT MANAGEMENT
// ============================================

/**
 * Get all payments (admin only)
 */
router.get('/admin/payments', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req: IAuthRequest, res: Response) => {
  try {
    const { status, method, type, limit = 50 } = req.query;
    
    const filter: any = {};
    if (status) filter.status = status;
    if (method) filter.paymentMethod = method;
    if (type) filter.type = type;
    
    const payments = await Payment.find(filter)
      .populate('customer', 'displayName email phoneNumber')
      .populate('rider', 'displayName email phoneNumber')
      .populate('order', 'orderNumber totalAmount')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string));
    
    // Get statistics
    const stats = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    return res.json({
      success: true,
      payments: payments,
      stats: stats
    });
    
  } catch (error: any) {
    console.error('[Admin] Get payments error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Approve payout request
 */
router.post('/admin/approve-payout/:payoutId', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req: IAuthRequest, res: Response) => {
  try {
    const { payoutId } = req.params;
    
    console.log('[Admin] Approving payout:', payoutId);
    
    const payout = await Payment.findByIdAndUpdate(
      payoutId,
      {
        status: 'APPROVED',
        approvedBy: req.user?._id,
        approvedAt: new Date()
      },
      { new: true }
    );
    
    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found'
      });
    }
    
    // TODO: Integrate with Stripe Connect for automatic transfers
    
    return res.json({
      success: true,
      message: 'Payout approved',
      payout: payout
    });
    
  } catch (error: any) {
    console.error('[Admin] Approve payout error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Reject payout request
 */
router.post('/admin/reject-payout/:payoutId', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req: IAuthRequest, res: Response) => {
  try {
    const { payoutId } = req.params;
    const { reason } = req.body;
    
    const payout = await Payment.findByIdAndUpdate(
      payoutId,
      {
        status: 'FAILED',
        failureReason: reason
      },
      { new: true }
    );
    
    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found'
      });
    }
    
    // Refund to rider's payout balance
    if (payout.rider) {
      await User.findByIdAndUpdate(payout.rider, { $inc: { payoutBalance: payout.amount } });
    }
    
    return res.json({
      success: true,
      message: 'Payout rejected and amount refunded to wallet',
      payout: payout
    });
    
  } catch (error: any) {
    console.error('[Admin] Reject payout error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Process refund for order payment
 */
router.post('/refund/:paymentId', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req: IAuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;
    
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    if (payment.status !== 'SUCCESS') {
      return res.status(400).json({
        success: false,
        message: 'Can only refund successful payments'
      });
    }
    
    // Process Stripe refund if card payment
    if (payment.stripePaymentIntentId) {
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined
      });
      
      payment.transactionId = refund.id;
    }
    
    // Update payment
    payment.status = 'REFUNDED';
    payment.refundAmount = amount || payment.amount;
    payment.refundReason = reason;
    payment.refundedAt = new Date();
    await payment.save();
    
    // Update order
    await Order.findByIdAndUpdate(payment.order, {
      paymentStatus: 'refunded'
    });
    
    return res.json({
      success: true,
      message: 'Refund processed',
      payment: payment
    });
    
  } catch (error: any) {
    console.error('[Admin] Refund error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get payment statistics (admin dashboard)
 */
router.get('/admin/stats', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req: IAuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const [todayStats, monthStats, totalStats, methodBreakdown] = await Promise.all([
      Payment.aggregate([
        { $match: { createdAt: { $gte: today }, type: 'order_payment' } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { createdAt: { $gte: monthStart }, type: 'order_payment' } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { type: 'order_payment' } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { type: 'order_payment' } },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$amount' } } }
      ])
    ]);
    
    return res.json({
      success: true,
      stats: {
        today: todayStats[0] || { count: 0, total: 0 },
        month: monthStats[0] || { count: 0, total: 0 },
        total: totalStats[0] || { count: 0, total: 0 },
        byMethod: methodBreakdown
      }
    });
    
  } catch (error: any) {
    console.error('[Admin] Get stats error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
