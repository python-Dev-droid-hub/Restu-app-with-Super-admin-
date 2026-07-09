import { Response } from 'express';
import { EmailTemplate } from '@/superadmin/models/EmailTemplate';
import { ISuperAdminRequest } from '@/superadmin/types';
import { ensureEmailTemplates, renderTemplate } from '@/superadmin/services/emailTemplate.service';
import { asyncHandler, sendSuccess, createError } from '@/utils';

export const list = asyncHandler(async (_req: ISuperAdminRequest, res: Response) => {
  await ensureEmailTemplates();
  const templates = await EmailTemplate.find({}).sort({ key: 1 });
  sendSuccess(res, { templates });
});

export const getByKey = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  await ensureEmailTemplates();
  const template = await EmailTemplate.findOne({ key: req.params.key.toUpperCase() });
  if (!template) throw createError('Template not found.', 404);
  sendSuccess(res, {
    template,
    availableVars: [
      'restaurant_name', 'owner_name', 'owner_email', 'plan_name',
      'trial_end_date', 'login_url', 'support_email', 'temp_password',
      'slug', 'amount', 'days_remaining', 'reason',
    ],
  });
});

export const update = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  await ensureEmailTemplates();
  const template = await EmailTemplate.findOne({ key: req.params.key.toUpperCase() });
  if (!template) throw createError('Template not found.', 404);

  if (req.body.subject) template.subject = req.body.subject;
  if (req.body.body) template.body = req.body.body;
  if (req.body.isActive !== undefined) template.isActive = req.body.isActive;
  await template.save();
  sendSuccess(res, { template }, 'Template updated');
});

export const preview = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  await ensureEmailTemplates();
  const template = await EmailTemplate.findOne({ key: req.params.key.toUpperCase() });
  if (!template) throw createError('Template not found.', 404);

  const sampleVars: Record<string, string> = {
    restaurant_name: 'Demo Restaurant',
    owner_name: 'John Doe',
    owner_email: 'owner@demo.com',
    plan_name: 'Pro',
    trial_end_date: new Date(Date.now() + 7 * 86400000).toLocaleDateString(),
    login_url: 'https://demo.yourapp.com/login',
    support_email: process.env.SUPPORT_EMAIL || 'support@yourapp.com',
    temp_password: 'TempPass123!',
    slug: 'demo',
    amount: '5000',
    days_remaining: '3',
    reason: 'Payment overdue',
  };

  sendSuccess(res, {
    subject: renderTemplate(template.subject, sampleVars),
    body: renderTemplate(template.body, sampleVars),
  });
});
