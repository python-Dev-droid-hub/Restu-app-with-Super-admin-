import nodemailer from 'nodemailer';
import { logger } from '@/utils/logger';
import { getRenderedEmail } from './emailTemplate.service';
import { getPlatformSettings } from './platformSettings.service';

interface WelcomeEmailParams {
  ownerEmail: string;
  ownerName: string;
  restaurantName: string;
  slug: string;
  tempPassword: string;
  loginUrl: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

async function dispatchEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
  const from = process.env.EMAIL_FROM || 'noreply@yourapp.com';
  const transport = getTransporter();
  if (!transport) {
    logger.info(`[SuperAdmin Email]\nTo: ${to}\nSubject: ${subject}\n${text}`);
    return;
  }
  await transport.sendMail({ from, to, subject, text, html: html || text.replace(/\n/g, '<br>') });
}

export async function sendCustomEmail(to: string, subject: string, body: string): Promise<void> {
  await dispatchEmail(to, subject, body);
}

async function supportEmail(): Promise<string> {
  try {
    const settings = await getPlatformSettings();
    return settings.supportEmail || process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || 'support@yourapp.com';
  } catch {
    return process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || 'support@yourapp.com';
  }
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<void> {
  const support = await supportEmail();
  const rendered = await getRenderedEmail('WELCOME', {
    restaurant_name: params.restaurantName,
    owner_name: params.ownerName,
    owner_email: params.ownerEmail,
    slug: params.slug,
    login_url: params.loginUrl,
    temp_password: params.tempPassword,
    support_email: support,
  });
  if (rendered) {
    await dispatchEmail(params.ownerEmail, rendered.subject, rendered.body);
    return;
  }
  const text =
    `Welcome!\n\nHi ${params.ownerName},\n\n"${params.restaurantName}" is live at ${params.slug}.yourapp.com\n\n` +
    `Login: ${params.loginUrl}\nEmail: ${params.ownerEmail}\nTemporary password: ${params.tempPassword}\n\n` +
    `Support: ${support}`;
  await dispatchEmail(params.ownerEmail, `Welcome! ${params.restaurantName} is ready`, text);
}

export async function sendTrialExpiryWarning(
  ownerEmail: string,
  ownerName: string,
  restaurantName: string,
  daysRemaining: number
): Promise<void> {
  const support = await supportEmail();
  const rendered = await getRenderedEmail('TRIAL_EXPIRY', {
    owner_name: ownerName,
    restaurant_name: restaurantName,
    days_remaining: String(daysRemaining),
    support_email: support,
  });
  if (rendered) {
    await dispatchEmail(ownerEmail, rendered.subject, rendered.body);
    return;
  }
  await dispatchEmail(
    ownerEmail,
    `Trial expires in ${daysRemaining} days — ${restaurantName}`,
    `Hi ${ownerName},\n\nYour trial for ${restaurantName} expires in ${daysRemaining} days. Upgrade to keep your account active.`
  );
}

export async function sendPaymentFailedEmail(params: {
  ownerEmail: string;
  restaurantName: string;
  amount: number;
}): Promise<void> {
  const support = await supportEmail();
  const rendered = await getRenderedEmail('PAYMENT_FAILED', {
    restaurant_name: params.restaurantName,
    amount: String(params.amount),
    support_email: support,
  });
  if (rendered) {
    await dispatchEmail(params.ownerEmail, rendered.subject, rendered.body);
    return;
  }
  await dispatchEmail(
    params.ownerEmail,
    `Payment failed — ${params.restaurantName}`,
    `Action required: Payment of PKR ${params.amount} failed for ${params.restaurantName}. Please update your payment method.`
  );
}

export async function sendSubscriptionRenewedEmail(params: {
  ownerEmail: string;
  restaurantName: string;
  planName: string;
  amount: number;
  nextRenewal: Date;
}): Promise<void> {
  const support = await supportEmail();
  const rendered = await getRenderedEmail('RENEWAL_REMINDER', {
    owner_name: params.ownerEmail,
    restaurant_name: params.restaurantName,
    plan_name: params.planName,
    trial_end_date: params.nextRenewal.toLocaleDateString(),
    amount: String(params.amount),
    support_email: support,
  });
  if (rendered) {
    await dispatchEmail(params.ownerEmail, rendered.subject, rendered.body);
    return;
  }
  await dispatchEmail(
    params.ownerEmail,
    `Subscription renewed — ${params.restaurantName}`,
    `Subscription renewed for ${params.restaurantName}.\nPlan: ${params.planName}\nAmount: PKR ${params.amount}\nNext renewal: ${params.nextRenewal.toLocaleDateString()}`
  );
}

export async function sendAccountSuspendedEmail(
  ownerEmail: string,
  restaurantName: string,
  reason: string
): Promise<void> {
  const support = await supportEmail();
  const rendered = await getRenderedEmail('SUSPENSION', {
    restaurant_name: restaurantName,
    reason,
    support_email: support,
  });
  if (rendered) {
    await dispatchEmail(ownerEmail, rendered.subject, rendered.body);
    return;
  }
  await dispatchEmail(
    ownerEmail,
    `Account suspended — ${restaurantName}`,
    `Your account has been suspended.\n\nReason: ${reason}\n\nContact support to resolve.`
  );
}

export async function sendAnnouncementEmail(params: {
  to: string;
  title: string;
  body: string;
  restaurantName: string;
}): Promise<void> {
  const text =
    `Platform Announcement\n\n${params.title}\n\n${params.body}\n\n— ${params.restaurantName}`;
  await dispatchEmail(params.to, `[Platform] ${params.title}`, text);
}

export async function sendSupportTicketReplyEmail(params: {
  to: string;
  subject: string;
  replyBody: string;
  ticketSubject: string;
}): Promise<void> {
  const text =
    `Support update on: ${params.ticketSubject}\n\n${params.replyBody}\n\nReply in your admin panel under Support.`;
  await dispatchEmail(params.to, `Re: ${params.subject}`, text);
}
