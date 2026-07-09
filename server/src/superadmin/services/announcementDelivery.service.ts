import { PlatformAnnouncement, Tenant } from '@/superadmin/models';
import { User } from '@/models/User';
import { Notification } from '@/models/Notification';
import { sendAnnouncementEmail } from './emailNotification.service';
import { logger } from '@/utils/logger';

export async function resolveTargetTenants(announcement: any) {
  if (announcement.targetType === 'ALL') {
    return Tenant.find({ isActive: true, deletedAt: null });
  }
  if (announcement.targetType === 'PLAN' && announcement.targetPlanId) {
    return Tenant.find({ planId: announcement.targetPlanId, isActive: true, deletedAt: null });
  }
  if (announcement.targetType === 'TENANTS' && announcement.targetTenantIds?.length) {
    return Tenant.find({ _id: { $in: announcement.targetTenantIds }, isActive: true });
  }
  if (announcement.targetType === 'CITIES' && announcement.targetCities?.length) {
    return Tenant.find({
      city: { $in: announcement.targetCities },
      isActive: true,
      deletedAt: null,
    });
  }
  return [];
}

export async function deliverAnnouncement(announcement: any) {
  const tenants = await resolveTargetTenants(announcement);
  let notificationCount = 0;
  let emailCount = 0;

  for (const tenant of tenants) {
    const admins = await User.find({
      tenantId: tenant._id,
      role: { $in: ['ADMIN', 'BRANCH_MANAGER'] },
      isActive: true,
    });

    for (const admin of admins) {
      if (announcement.channels?.inApp !== false) {
        await Notification.create({
          recipient: admin._id,
          title: announcement.title,
          body: announcement.body.slice(0, 2000),
          type: 'SYSTEM_ALERT',
        });
        notificationCount += 1;
      }

      if (announcement.channels?.email && admin.email) {
        try {
          await sendAnnouncementEmail({
            to: admin.email,
            title: announcement.title,
            body: announcement.body,
            restaurantName: tenant.name,
          });
          emailCount += 1;
        } catch (err) {
          logger.warn(`[Announcement] Email failed for ${admin.email}: ${(err as Error).message}`);
        }
      }
    }
  }

  announcement.status = 'SENT';
  announcement.sentAt = new Date();
  await announcement.save();

  return { tenantCount: tenants.length, notificationCount, emailCount };
}

export async function processScheduledAnnouncements() {
  const due = await PlatformAnnouncement.find({
    status: 'SCHEDULED',
    scheduledAt: { $lte: new Date() },
  });

  for (const announcement of due) {
    try {
      await deliverAnnouncement(announcement);
      logger.info(`[Announcement] Scheduled send: "${announcement.title}"`);
    } catch (err) {
      logger.error(`[Announcement] Failed scheduled send ${announcement._id}:`, err);
    }
  }

  return due.length;
}
