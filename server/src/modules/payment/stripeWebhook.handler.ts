import { Request, Response } from 'express';
import Stripe from 'stripe';
import { Payment } from '@/models/Payment';
import { Order } from '@/models/Order';
import { logger } from '@/utils/logger';
import { getStripeClient, isStripeConfigured } from '@/config/stripe';

export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'] as string;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!isStripeConfigured()) {
    res.status(503).send('Stripe is not configured');
    return;
  }

  if (!secret?.trim()) {
    res.status(503).send('Webhook not configured');
    return;
  }

  try {
    const stripe = getStripeClient();
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const event = stripe.webhooks.constructEvent(rawBody, sig, secret);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          { status: 'SUCCESS', completedAt: new Date() }
        );
        await Order.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          { paymentStatus: 'SUCCESS', status: 'CONFIRMED' }
        );
        break;
      }
      case 'payment_intent.payment_failed': {
        const failedIntent = event.data.object as Stripe.PaymentIntent;
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: failedIntent.id },
          { status: 'FAILED', failureReason: 'Payment failed' }
        );
        await Order.findOneAndUpdate(
          { stripePaymentIntentId: failedIntent.id },
          { paymentStatus: 'FAILED' }
        );
        break;
      }
      default:
        break;
    }

    res.json({ received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook error';
    logger.error('[Stripe Webhook]', message);
    res.status(400).send(`Webhook Error: ${message}`);
  }
}
