import { EmailTemplate, EMAIL_TEMPLATE_KEYS } from '@/superadmin/models/EmailTemplate';

export const DEFAULT_TEMPLATES: Record<
  string,
  { name: string; subject: string; body: string }
> = {
  WELCOME: {
    name: 'Welcome Email',
    subject: 'Welcome! {{restaurant_name}} is ready',
    body:
      'Hi {{owner_name}},\n\n"{{restaurant_name}}" is live at {{slug}}.yourapp.com\n\n' +
      'Login: {{login_url}}\nEmail: {{owner_email}}\nTemporary password: {{temp_password}}\n\n' +
      'Support: {{support_email}}',
  },
  TRIAL_EXPIRY: {
    name: 'Trial Expiry Warning',
    subject: 'Trial expires in {{days_remaining}} days — {{restaurant_name}}',
    body:
      'Hi {{owner_name}},\n\nYour trial for {{restaurant_name}} expires in {{days_remaining}} days.\n' +
      'Upgrade to keep your account active.\n\nSupport: {{support_email}}',
  },
  RENEWAL_REMINDER: {
    name: 'Renewal Reminder',
    subject: 'Subscription renewal — {{restaurant_name}}',
    body:
      'Hi {{owner_name}},\n\nYour {{plan_name}} subscription for {{restaurant_name}} renews on {{trial_end_date}}.\n' +
      'Amount: PKR {{amount}}\n\nSupport: {{support_email}}',
  },
  PAYMENT_FAILED: {
    name: 'Payment Failed',
    subject: 'Payment failed — {{restaurant_name}}',
    body:
      'Action required: Payment of PKR {{amount}} failed for {{restaurant_name}}.\n' +
      'Please update your payment method.\n\nSupport: {{support_email}}',
  },
  SUSPENSION: {
    name: 'Account Suspended',
    subject: 'Account suspended — {{restaurant_name}}',
    body:
      'Your account has been suspended.\n\nReason: {{reason}}\n\nContact {{support_email}} to resolve.',
  },
};

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export async function ensureEmailTemplates() {
  for (const key of EMAIL_TEMPLATE_KEYS) {
    const exists = await EmailTemplate.findOne({ key });
    if (!exists) {
      const def = DEFAULT_TEMPLATES[key];
      await EmailTemplate.create({ key, ...def });
    }
  }
}

export async function getRenderedEmail(
  key: string,
  vars: Record<string, string>
): Promise<{ subject: string; body: string } | null> {
  await ensureEmailTemplates();
  const template = await EmailTemplate.findOne({ key, isActive: true });
  if (!template) return null;
  return {
    subject: renderTemplate(template.subject, vars),
    body: renderTemplate(template.body, vars),
  };
}
