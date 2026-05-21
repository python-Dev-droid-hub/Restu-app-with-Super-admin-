import { Types } from 'mongoose';
import { User } from '@/models/User';
import { Branch } from '@/models/Branch';
import { dispatchNotification } from './notificationDispatchService';
import NotificationService from './notificationService';

async function resolveBranchName(branchId?: string | Types.ObjectId | null): Promise<string> {
  if (!branchId) return 'All Branches';
  const id = String(branchId);
  const branch = await Branch.findById(id).select('name branchName').lean();
  return (branch as { name?: string; branchName?: string } | null)?.name ||
    (branch as { branchName?: string } | null)?.branchName ||
    'your branch';
}

function actorName(user: { displayName?: string; email?: string } | null | undefined): string {
  return user?.displayName || user?.email || 'System';
}

/** Admin changed a user's role — notify the affected user. */
export async function notifyRoleAssignedByAdmin(params: {
  adminId: string;
  targetUserId: string;
  newRole: string;
  previousRole?: string;
  branchId?: string;
}) {
  const [admin, target] = await Promise.all([
    User.findById(params.adminId).select('displayName email role').lean(),
    User.findById(params.targetUserId).select('displayName assignedBranch role').lean(),
  ]);
  if (!target) return;

  const branchName = await resolveBranchName(
    params.branchId || (target as { assignedBranch?: Types.ObjectId }).assignedBranch
  );

  const title = 'Role updated';
  const message = `${actorName(admin)} assigned you role '${params.newRole}' in branch '${branchName}'.`;

  await dispatchNotification({
    recipient: params.targetUserId,
    type: 'STAFF_ALERT',
    title,
    message,
    priority: 'HIGH',
    recipientRole: params.newRole,
    recipientBranch: params.branchId,
    data: {
      event: 'ROLE_ASSIGNED_BY_ADMIN',
      role: params.newRole,
      previousRole: params.previousRole,
      branchId: params.branchId,
      branchName,
      adminId: params.adminId,
      adminName: actorName(admin),
    },
  });
}

/** Manager changed/added a staff role — notify restaurant admins. */
export async function notifyRoleChangedByManager(params: {
  managerId: string;
  targetUserId: string;
  newRole: string;
  previousRole?: string;
  branchId?: string;
  roleDetails?: string;
}) {
  const [manager, target] = await Promise.all([
    User.findById(params.managerId).select('displayName email assignedBranch').lean(),
    User.findById(params.targetUserId).select('displayName email role').lean(),
  ]);
  if (!manager || !target) return;

  const branchName = await resolveBranchName(
    params.branchId || (manager as { assignedBranch?: Types.ObjectId }).assignedBranch
  );

  const details =
    params.roleDetails ||
    `User: ${target.displayName || target.email}, role: ${params.newRole}`;

  const title = 'Staff role updated';
  const message = `Manager ${actorName(manager)} updated role to '${params.newRole}' in branch '${branchName}'. ${details}`;

  await NotificationService.notifyByRole({
    role: 'ADMIN',
    branchId: params.branchId,
    type: 'STAFF_ALERT',
    title,
    message,
    priority: 'MEDIUM',
    data: {
      event: 'ROLE_CHANGED_BY_MANAGER',
      targetUserId: params.targetUserId,
      targetUserName: target.displayName || target.email,
      newRole: params.newRole,
      previousRole: params.previousRole,
      branchId: params.branchId,
      branchName,
      managerId: params.managerId,
      managerName: actorName(manager),
      roleDetails: details,
    },
  });

  await NotificationService.notifyByRole({
    role: 'SUPER_ADMIN',
    type: 'STAFF_ALERT',
    title,
    message,
    priority: 'MEDIUM',
    data: {
      event: 'ROLE_CHANGED_BY_MANAGER',
      targetUserId: params.targetUserId,
      newRole: params.newRole,
      branchName,
    },
  });
}
