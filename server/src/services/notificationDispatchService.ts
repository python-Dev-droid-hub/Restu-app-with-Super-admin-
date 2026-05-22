import { Types } from 'mongoose';
import { Notification } from '@/models/Notification';
import { User } from '@/models/User';
import { sendPushToDevice } from './fcmService';
import { logger } from '@/utils/logger';

export interface DispatchNotificationInput {
  recipient: string;
  type: string;
  title: string;
  message: string;
  description?: string;
  priority?: string;
  data?: Record<string, unknown>;
  relatedOrder?: string;
  actionUrl?: string;
  recipientRole?: string;
  recipientBranch?: string;
}

function normalizeOrderId(data?: Record<string, unknown>, relatedOrder?: string): string | undefined {
  const fromData =
    data?.orderId ||
    data?.order_id ||
    data?.relatedOrderId ||
  relatedOrder;
  if (!fromData) return undefined;
  return String(fromData);
}

function buildSocketPayload(
  notification: { _id: Types.ObjectId; createdAt?: Date; isRead?: boolean },
  input: DispatchNotificationInput
) {
  const orderId = normalizeOrderId(input.data, input.relatedOrder);
  const data = {
    ...(input.data || {}),
    ...(orderId ? { orderId, order_id: orderId } : {}),
    notificationId: notification._id.toString(),
  };

  return {
    id: notification._id.toString(),
    _id: notification._id.toString(),
    type: input.type,
    title: input.title,
    message: input.message,
    body: input.message,
    data,
    relatedOrderId: orderId,
    orderId,
    isRead: notification.isRead ?? false,
    read: notification.isRead ?? false,
    createdAt: notification.createdAt?.toISOString?.() || new Date().toISOString(),
    actionUrl: input.actionUrl,
  };
}

function emitRealtime(recipientId: string, payload: ReturnType<typeof buildSocketPayload>) {
  try {
    const ws = (globalThis as { ws?: { sendNotification?: (id: string, p: unknown) => void } }).ws;
    if (!ws?.sendNotification) return;
    ws.sendNotification(recipientId, payload);
  } catch (error) {
    logger.error('[NotificationDispatch] WebSocket emit failed', error);
  }
}

export async function dispatchNotification(input: DispatchNotificationInput) {
  try {
    const user = await User.findById(input.recipient).select('role assignedBranch fcmToken');
    if (!user) {
      logger.warn('[NotificationDispatch] Recipient not found:', input.recipient);
      return null;
    }

    const orderId = normalizeOrderId(input.data, input.relatedOrder);
    const mergedData = {
      ...(input.data || {}),
      ...(orderId ? { orderId, order_id: orderId } : {}),
    };

    const notification = await Notification.create({
      recipient: input.recipient,
      recipientRole: input.recipientRole || user.role,
      recipientBranch: input.recipientBranch || user.assignedBranch,
      type: input.type,
      title: input.title,
      body: input.message,
      description: input.description,
      priority: input.priority || 'NORMAL',
      data: mergedData,
      relatedOrder: orderId && Types.ObjectId.isValid(orderId) ? orderId : input.relatedOrder,
      actionUrl: input.actionUrl || (orderId ? `/orders/${orderId}` : undefined),
      deliveryMethod: 'IN_APP',
      isRead: false,
    });

    const socketPayload = buildSocketPayload(notification, input);
    emitRealtime(input.recipient, socketPayload);

    if (user.fcmToken) {
      const fcmData: Record<string, string> = {
        type: input.type,
        notificationId: notification._id.toString(),
      };
      if (orderId) fcmData.orderId = orderId;
      const orderNumber = input.data?.orderNumber ?? input.data?.order_number;
      if (orderNumber != null && orderNumber !== '') fcmData.orderNumber = String(orderNumber);

      const sent = await sendPushToDevice(user.fcmToken, {
        title: input.title,
        body: input.message,
        data: fcmData,
      });
      if (!sent) {
        logger.warn('[NotificationDispatch] FCM failed; in-app + socket still delivered', input.recipient);
      }
    }

    return notification;
  } catch (error) {
    logger.error('[NotificationDispatch] Failed', error);
    return null;
  }
}

export async function registerFcmToken(userId: string, fcmToken: string) {
  if (!fcmToken?.trim()) return false;
  const updated = await User.findByIdAndUpdate(userId, { fcmToken: fcmToken.trim() }, { new: true });
  return !!updated;
}
