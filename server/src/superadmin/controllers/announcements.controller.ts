import { Response } from 'express';
import { PlatformAnnouncement } from '@/superadmin/models';
import { ISuperAdminRequest } from '@/superadmin/types';
import { deliverAnnouncement } from '@/superadmin/services/announcementDelivery.service';
import { asyncHandler, sendSuccess, sendCreated, createError } from '@/utils';

export const list = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;

  const announcements = await PlatformAnnouncement.find(filter).sort({ createdAt: -1 }).limit(100);
  sendSuccess(res, { announcements });
});

export const getById = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const announcement = await PlatformAnnouncement.findById(req.params.id);
  if (!announcement) throw createError('Announcement not found.', 404);
  sendSuccess(res, { announcement });
});

export const create = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const sendNow = req.body.sendNow && !req.body.scheduledAt;
  const announcement = await PlatformAnnouncement.create({
    ...req.body,
    createdBy: req.superAdmin?._id,
    status: sendNow ? 'SENT' : req.body.scheduledAt ? 'SCHEDULED' : 'DRAFT',
  });

  if (sendNow) {
    const result = await deliverAnnouncement(announcement);
    return sendCreated(res, { announcement, delivery: result }, 'Announcement sent');
  }

  sendCreated(res, { announcement }, 'Announcement created');
});

export const send = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const announcement = await PlatformAnnouncement.findById(req.params.id);
  if (!announcement) throw createError('Announcement not found.', 404);
  if (announcement.status === 'SENT') throw createError('Already sent.', 400);

  const result = await deliverAnnouncement(announcement);
  sendSuccess(res, { announcement, delivery: result }, 'Announcement sent');
});

export const update = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const announcement = await PlatformAnnouncement.findById(req.params.id);
  if (!announcement) throw createError('Announcement not found.', 404);
  if (announcement.status === 'SENT') throw createError('Cannot edit sent announcement.', 400);

  Object.assign(announcement, req.body);
  await announcement.save();
  sendSuccess(res, { announcement }, 'Announcement updated');
});

export const remove = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const announcement = await PlatformAnnouncement.findById(req.params.id);
  if (!announcement) throw createError('Announcement not found.', 404);
  if (announcement.status === 'SENT') throw createError('Cannot delete sent announcement.', 400);
  await announcement.deleteOne();
  sendSuccess(res, null, 'Announcement deleted');
});
