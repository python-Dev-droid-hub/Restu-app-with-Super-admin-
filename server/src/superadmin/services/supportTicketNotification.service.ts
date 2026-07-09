import { Types } from 'mongoose';
import { User } from '@/models/User';
import { Notification } from '@/models/Notification';
import { Tenant } from '@/superadmin/models/Tenant';
import { SupportTicket } from '@/superadmin/models/SupportTicket';
import { logger } from '@/utils/logger';

interface NotifyTenantSupportInput {
  tenantId: string;
  ticketId: string;
  subject: string;
  title: string;
  body: string;
  raisedBy?: string;
}

function emitRealtime(recipientId: string, payload: Record<string, unknown>) {
  try {
    const ws = (globalThis as { ws?: { sendNotification?: (id: string, p: unknown) => void } }).ws;
    ws?.sendNotification?.(recipientId, payload);
  } catch (err) {
    logger.warn(`[SupportTicketNotify] WebSocket emit failed: ${(err as Error).message}`);
  }
}

export async function resolveSupportTicketRecipientIds(
  tenantId: string,
  raisedBy?: string
): Promise<string[]> {
  const ids = new Set<string>();
  const tenantOid = Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : null;
  if (!tenantOid) return [];

  const tenant = await Tenant.findById(tenantOid).select('ownerUserId').lean();
  if (tenant?.ownerUserId) {
    ids.add(String(tenant.ownerUserId));
  }

  if (raisedBy && Types.ObjectId.isValid(String(raisedBy))) {
    ids.add(String(raisedBy));
  }

  const admins = await User.find({
    isActive: true,
    role: { $in: ['ADMIN', 'BRANCH_MANAGER'] },
    $or: [{ tenantId: tenantOid }, { tenantId: String(tenantOid) }],
  }).select('_id');

  for (const admin of admins) {
    ids.add(String(admin._id));
  }

  return [...ids];
}

export async function notifyTenantAdminsOfSupportTicket(
  input: NotifyTenantSupportInput
): Promise<number> {
  const recipientIds = await resolveSupportTicketRecipientIds(input.tenantId, input.raisedBy);
  if (recipientIds.length === 0) {
    logger.warn(`[SupportTicketNotify] No recipients for tenant ${input.tenantId}`);
    return 0;
  }

  let sent = 0;
  for (const recipientId of recipientIds) {
    try {
      const user = await User.findById(recipientId).select('role').lean();
      if (!user) continue;

      const notification = await Notification.create({
        recipient: recipientId,
        recipientRole: user.role || 'ADMIN',
        type: 'SYSTEM_ALERT',
        title: input.title,
        body: input.body.slice(0, 2000),
        actionUrl: '/admin/support',
        deliveryMethod: 'IN_APP',
        isRead: false,
        data: {
          tenantId: input.tenantId,
          ticketId: input.ticketId,
          supportTicketId: input.ticketId,
          subject: input.subject,
        },
      });

      emitRealtime(recipientId, {
        id: String(notification._id),
        _id: String(notification._id),
        type: 'SYSTEM_ALERT',
        title: input.title,
        message: input.body,
        body: input.body,
        isRead: false,
        read: false,
        createdAt: notification.createdAt?.toISOString?.() || new Date().toISOString(),
        actionUrl: '/admin/support',
        data: notification.data,
      });
      sent += 1;
    } catch (err) {
      logger.warn(
        `[SupportTicketNotify] Failed for admin ${recipientId}: ${(err as Error).message}`
      );
    }
  }

  logger.info(
    `[SupportTicketNotify] Sent ${sent}/${recipientIds.length} for ticket ${input.ticketId}`
  );
  return sent;
}

export async function notifySupportTicketStatusChange(
  tenantId: string,
  ticketId: string,
  subject: string,
  status: string,
  raisedBy?: string
): Promise<void> {
  const messages: Record<string, { title: string; body: string }> = {
    IN_PROGRESS: {
      title: 'Support ticket in progress',
      body: `Platform support is working on your ticket: "${subject}".`,
    },
    WAITING_REPLY: {
      title: 'Support ticket update',
      body: `Platform support needs your input on: "${subject}".`,
    },
    RESOLVED: {
      title: 'Support ticket resolved',
      body: `Your support ticket "${subject}" has been resolved by platform support.`,
    },
    CLOSED: {
      title: 'Support ticket closed',
      body: `Your support ticket "${subject}" has been closed.`,
    },
    OPEN: {
      title: 'Support ticket reopened',
      body: `Your support ticket "${subject}" has been reopened.`,
    },
  };

  const msg = messages[status];
  if (!msg) return;

  await notifyTenantAdminsOfSupportTicket({
    tenantId,
    ticketId,
    subject,
    title: msg.title,
    body: msg.body,
    raisedBy,
  });
}

export async function notifySupportTicketReply(
  tenantId: string,
  ticketId: string,
  subject: string,
  replyPreview?: string,
  raisedBy?: string
): Promise<void> {
  const preview = replyPreview?.trim()
    ? ` ${replyPreview.slice(0, 120)}${replyPreview.length > 120 ? '…' : ''}`
    : '';

  await notifyTenantAdminsOfSupportTicket({
    tenantId,
    ticketId,
    subject,
    title: 'New reply on support ticket',
    body: `Platform support replied on "${subject}".${preview}`,
    raisedBy,
  });
}

/** Backfill notifications for tickets resolved before notify logic existed */
export async function syncPendingSupportTicketNotifications(tenantId: string): Promise<number> {
  if (!Types.ObjectId.isValid(tenantId)) return 0;

  const tickets = await SupportTicket.find({
    tenantId: new Types.ObjectId(tenantId),
    status: { $in: ['RESOLVED', 'CLOSED'] },
    $or: [{ tenantNotifiedAt: { $exists: false } }, { tenantNotifiedAt: null }],
  })
    .sort({ updatedAt: -1 })
    .limit(20);

  let synced = 0;
  for (const ticket of tickets) {
    await notifySupportTicketStatusChange(
      tenantId,
      String(ticket._id),
      ticket.subject,
      ticket.status,
      ticket.raisedBy ? String(ticket.raisedBy) : undefined
    );
    ticket.tenantNotifiedAt = new Date();
    await ticket.save();
    synced += 1;
  }

  if (synced > 0) {
    logger.info(`[SupportTicketNotify] Backfilled ${synced} ticket(s) for tenant ${tenantId}`);
  }
  return synced;
}
