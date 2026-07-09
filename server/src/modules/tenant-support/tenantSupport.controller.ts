import { Response } from 'express';
import { Types } from 'mongoose';
import { SupportTicket, SupportTicketMessage } from '@/superadmin/models';
import { IAuthRequest } from '@/types';
import type { ISaasTenantRequest } from '@/superadmin/middleware/tenantIsolation.middleware';
import { logTenantActivity } from '@/superadmin/utils/helpers';
import { asyncHandler, sendSuccess, sendCreated, createError } from '@/utils';
import { getTenantIdFromRequest } from '@/utils/tenantScope';

function getTenantId(req: IAuthRequest & ISaasTenantRequest): string {
  const tenantId =
    getTenantIdFromRequest(req) ||
    (req.tenant?._id ? String(req.tenant._id) : undefined);
  if (!tenantId) throw createError('No tenant associated with this account.', 403);
  return tenantId;
}

function tenantObjectId(tenantId: string) {
  return new Types.ObjectId(tenantId);
}

export const listTickets = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const tenantId = getTenantId(req);
  const { syncPendingSupportTicketNotifications } = await import(
    '@/superadmin/services/supportTicketNotification.service'
  );
  await syncPendingSupportTicketNotifications(tenantId);

  const tickets = await SupportTicket.find({ tenantId: tenantObjectId(tenantId) })
    .sort({ updatedAt: -1 })
    .limit(50);
  sendSuccess(res, { tickets });
});

export const getTicket = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const tenantId = getTenantId(req);
  const ticket = await SupportTicket.findOne({
    _id: req.params.id,
    tenantId: tenantObjectId(tenantId),
  });
  if (!ticket) throw createError('Ticket not found.', 404);

  const messages = await SupportTicketMessage.find({
    ticketId: ticket._id,
    isInternal: { $ne: true },
  }).sort({ createdAt: 1 });

  sendSuccess(res, { ticket, messages });
});

export const createTicket = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const tenantId = getTenantId(req);
  const { subject, description, category, priority } = req.body;
  if (!subject || !description) throw createError('subject and description are required.', 400);

  const ticket = await SupportTicket.create({
    tenantId: tenantObjectId(tenantId),
    subject,
    description,
    category,
    priority: priority || 'NORMAL',
    raisedBy: req.user?._id,
  });
  await SupportTicketMessage.create({
    ticketId: ticket._id,
    authorId: req.user?._id,
    authorType: 'TENANT',
    authorName: req.user?.displayName || req.user?.email,
    body: description,
  });

  await logTenantActivity(tenantId, 'SUPPORT_TICKET_CREATED', {
    performedBy: String(req.user?._id),
    performedByType: 'TENANT',
    description: `Support ticket opened: ${subject}`,
    metadata: { ticketId: String(ticket._id) },
  });

  sendCreated(res, { ticket }, 'Ticket created');
});

export const replyToTicket = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const tenantId = getTenantId(req);
  const ticket = await SupportTicket.findOne({
    _id: req.params.id,
    tenantId: tenantObjectId(tenantId),
  });
  if (!ticket) throw createError('Ticket not found.', 404);
  if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
    throw createError('Cannot reply to a closed ticket.', 400);
  }

  const { body } = req.body;
  if (!body) throw createError('Reply body is required.', 400);

  const message = await SupportTicketMessage.create({
    ticketId: ticket._id,
    authorId: req.user?._id,
    authorType: 'TENANT',
    authorName: req.user?.displayName || req.user?.email,
    body,
  });

  if (ticket.status === 'IN_PROGRESS' || ticket.status === 'WAITING_REPLY') {
    ticket.status = 'WAITING_REPLY';
  }
  await ticket.save();

  sendCreated(res, { message }, 'Reply added');
});
