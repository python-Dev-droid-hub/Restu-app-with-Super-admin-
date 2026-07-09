import { Response } from 'express';
import { SupportTicket, SupportTicketMessage, SuperAdmin, Tenant } from '@/superadmin/models';
import { ISuperAdminRequest } from '@/superadmin/types';
import { logTenantActivity } from '@/superadmin/utils/helpers';
import { sendSupportTicketReplyEmail } from '@/superadmin/services/emailNotification.service';
import {
  notifySupportTicketReply,
  notifySupportTicketStatusChange,
} from '@/superadmin/services/supportTicketNotification.service';
import { asyncHandler, sendSuccess, sendCreated, createError } from '@/utils';

export const listAssignableAdmins = asyncHandler(async (_req: ISuperAdminRequest, res: Response) => {
  const admins = await SuperAdmin.find({ isActive: true }).select('displayName email role');
  sendSuccess(res, { admins });
});

export const listTickets = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const limit = Math.min(100, parseInt(String(req.query.limit || '20'), 10));
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
  if (req.query.tenantId) filter.tenantId = req.query.tenantId;
  if (req.query.search) {
    filter.$or = [
      { subject: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const [tickets, total, openCount, inProgressCount, resolvedToday] = await Promise.all([
    SupportTicket.find(filter)
      .populate('tenantId', 'name slug ownerEmail')
      .populate('assignedTo', 'displayName email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    SupportTicket.countDocuments(filter),
    SupportTicket.countDocuments({ status: 'OPEN' }),
    SupportTicket.countDocuments({ status: 'IN_PROGRESS' }),
    SupportTicket.countDocuments({
      status: 'RESOLVED',
      resolvedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),
  ]);

  sendSuccess(res, {
    tickets,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    stats: { openCount, inProgressCount, resolvedToday },
  });
});

export const getTicket = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const ticket = await SupportTicket.findById(req.params.id)
    .populate('tenantId', 'name slug ownerEmail ownerPhone city subscriptionStatus')
    .populate('assignedTo', 'displayName email role');
  if (!ticket) throw createError('Ticket not found.', 404);

  const messages = await SupportTicketMessage.find({ ticketId: ticket._id }).sort({ createdAt: 1 });
  sendSuccess(res, { ticket, messages });
});

export const createTicket = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const { tenantId, subject, description, category, priority } = req.body;
  if (!tenantId || !subject || !description) {
    throw createError('tenantId, subject, and description are required.', 400);
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw createError('Tenant not found.', 404);

  const ticket = await SupportTicket.create({
    tenantId,
    subject,
    description,
    category,
    priority: priority || 'NORMAL',
    raisedBy: req.superAdmin?._id,
  });

  await SupportTicketMessage.create({
    ticketId: ticket._id,
    authorId: req.superAdmin?._id,
    authorType: 'SUPER_ADMIN',
    authorName: req.superAdmin?.displayName || req.superAdmin?.email,
    body: description,
  });

  await logTenantActivity(String(tenantId), 'SUPPORT_TICKET_CREATED', {
    performedBy: String(req.superAdmin?._id),
    performedByType: 'SUPER_ADMIN',
    description: `Support ticket created: ${subject}`,
    metadata: { ticketId: String(ticket._id) },
  });

  sendCreated(res, { ticket }, 'Ticket created');
});

export const updateTicket = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) throw createError('Ticket not found.', 404);

  const previousStatus = ticket.status;
  const { status, priority, assignedTo, resolutionNotes } = req.body;
  if (status) ticket.status = status;
  if (priority) ticket.priority = priority;
  if (assignedTo !== undefined) ticket.assignedTo = assignedTo || undefined;
  if (resolutionNotes) ticket.resolutionNotes = resolutionNotes;
  if (status === 'RESOLVED' || status === 'CLOSED') ticket.resolvedAt = new Date();

  await ticket.save();

  const tenantId = String(ticket.tenantId);
  const raisedBy = ticket.raisedBy ? String(ticket.raisedBy) : undefined;
  const isResolvedStatus = status === 'RESOLVED' || status === 'CLOSED';
  const shouldNotifyResolution = isResolvedStatus && !ticket.tenantNotifiedAt;
  const shouldNotifyStatusChange = Boolean(status && status !== previousStatus);

  if (shouldNotifyResolution || shouldNotifyStatusChange) {
    await notifySupportTicketStatusChange(
      tenantId,
      String(ticket._id),
      ticket.subject,
      status || ticket.status,
      raisedBy
    );
    if (isResolvedStatus) {
      ticket.tenantNotifiedAt = new Date();
      await ticket.save();
    }
  }

  if (shouldNotifyStatusChange) {
    await logTenantActivity(tenantId, 'SUPPORT_TICKET_STATUS_CHANGED', {
      performedBy: String(req.superAdmin?._id),
      performedByType: 'SUPER_ADMIN',
      description: `Ticket status changed to ${status}: ${ticket.subject}`,
      metadata: { ticketId: String(ticket._id), status, previousStatus },
    });
  }

  if (assignedTo !== undefined) {
    await logTenantActivity(String(ticket.tenantId), 'SUPPORT_TICKET_ASSIGNED', {
      performedBy: String(req.superAdmin?._id),
      performedByType: 'SUPER_ADMIN',
      description: assignedTo ? `Ticket assigned` : `Ticket unassigned`,
      metadata: { ticketId: String(ticket._id), assignedTo },
    });
  }

  sendSuccess(res, { ticket }, 'Ticket updated');
});

export const replyToTicket = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const ticket = await SupportTicket.findById(req.params.id).populate('tenantId', 'ownerEmail ownerName name');
  if (!ticket) throw createError('Ticket not found.', 404);

  const { body, isInternal } = req.body;
  if (!body) throw createError('Reply body is required.', 400);

  const message = await SupportTicketMessage.create({
    ticketId: ticket._id,
    authorId: req.superAdmin?._id,
    authorType: 'SUPER_ADMIN',
    authorName: req.superAdmin?.displayName || req.superAdmin?.email,
    body,
    isInternal: Boolean(isInternal),
  });

  if (!isInternal) {
    if (['OPEN', 'WAITING_REPLY'].includes(ticket.status)) ticket.status = 'IN_PROGRESS';
    await ticket.save();

    const tenant = ticket.tenantId as any;
    const tenantId = String(tenant?._id || ticket.tenantId);

    await notifySupportTicketReply(
      tenantId,
      String(ticket._id),
      ticket.subject,
      body,
      ticket.raisedBy ? String(ticket.raisedBy) : undefined
    );

    if (tenant?.ownerEmail) {
      void sendSupportTicketReplyEmail({
        to: tenant.ownerEmail,
        subject: ticket.subject,
        replyBody: body,
        ticketSubject: ticket.subject,
      });
    }
  }

  sendCreated(res, { message }, 'Reply added');
});

export const getStats = asyncHandler(async (_req: ISuperAdminRequest, res: Response) => {
  const [open, inProgress, resolvedToday, urgent] = await Promise.all([
    SupportTicket.countDocuments({ status: 'OPEN' }),
    SupportTicket.countDocuments({ status: 'IN_PROGRESS' }),
    SupportTicket.countDocuments({
      status: 'RESOLVED',
      resolvedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),
    SupportTicket.countDocuments({ priority: 'URGENT', status: { $nin: ['RESOLVED', 'CLOSED'] } }),
  ]);
  sendSuccess(res, { open, inProgress, resolvedToday, urgent });
});
