import { Response } from 'express';
import { SuperAdmin, SuperAdminLoginLog } from '@/superadmin/models';
import { ISuperAdminRequest } from '@/superadmin/types';
import { asyncHandler, sendSuccess, sendCreated, createError } from '@/utils';

export const list = asyncHandler(async (_req: ISuperAdminRequest, res: Response) => {
  const members = await SuperAdmin.find({}).select('-passwordHash').sort({ createdAt: -1 });
  sendSuccess(res, { members });
});

export const create = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const { email, password, displayName, role, phoneNumber } = req.body;
  if (!email || !password) throw createError('email and password are required.', 400);

  const existing = await SuperAdmin.findOne({ email: email.toLowerCase() });
  if (existing) throw createError('Email already registered.', 409);

  const member = await SuperAdmin.create({
    email: email.toLowerCase(),
    passwordHash: password,
    displayName,
    role: role || 'SUPPORT_AGENT',
    phoneNumber,
  });

  const safe = member.toObject();
  delete (safe as any).passwordHash;
  sendCreated(res, { member: safe }, 'Team member created');
});

export const update = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const member = await SuperAdmin.findById(req.params.id);
  if (!member) throw createError('Team member not found.', 404);

  if (req.params.id === String(req.superAdmin?._id) && req.body.isActive === false) {
    throw createError('You cannot deactivate your own account.', 400);
  }

  if (req.body.displayName) member.displayName = req.body.displayName;
  if (req.body.role) member.role = req.body.role;
  if (req.body.isActive !== undefined) member.isActive = req.body.isActive;
  if (req.body.password) member.passwordHash = req.body.password;

  await member.save();
  const safe = member.toObject();
  delete (safe as any).passwordHash;
  sendSuccess(res, { member: safe }, 'Team member updated');
});

export const loginLogs = asyncHandler(async (req: ISuperAdminRequest, res: Response) => {
  const limit = Math.min(100, parseInt(String(req.query.limit || '50'), 10));
  const filter: Record<string, unknown> = {};
  if (req.query.superAdminId) filter.superAdminId = req.query.superAdminId;
  if (req.query.email) filter.email = { $regex: req.query.email, $options: 'i' };

  const logs = await SuperAdminLoginLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('superAdminId', 'displayName email role');

  sendSuccess(res, { logs });
});
