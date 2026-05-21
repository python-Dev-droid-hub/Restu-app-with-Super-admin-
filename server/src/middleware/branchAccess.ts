import { Types } from 'mongoose';
import { IAuthRequest } from '@/types';
import { createError } from '@/utils';

/** Resolve branch id from query/body for admins; managers are pinned to assigned branch. */
export function resolveEffectiveBranchId(
  req: IAuthRequest,
  branchIdQuery?: string | null
): string | undefined {
  const role = String(req.user?.role || '').toUpperCase();
  const raw = branchIdQuery && branchIdQuery !== 'all' ? String(branchIdQuery) : undefined;

  if (role === 'BRANCH_MANAGER') {
    const assigned = req.user?.assignedBranch as
      | { _id?: { toString(): string }; toString?: () => string }
      | string
      | undefined;
    if (!assigned) return undefined;
    if (typeof assigned === 'object' && assigned && '_id' in assigned) {
      return (assigned as { _id: { toString(): string } })._id?.toString?.();
    }
    return String(assigned);
  }

  return raw;
}

export function assertBranchAccess(req: IAuthRequest, branchId?: string): void {
  if (!branchId) return;
  const role = String(req.user?.role || '').toUpperCase();
  if (role !== 'BRANCH_MANAGER') return;

  const allowed = resolveEffectiveBranchId(req);
  if (!allowed) {
    throw createError('Access denied. No branch assigned.', 403);
  }

  const allowedList: string[] = [allowed];
  if (Types.ObjectId.isValid(allowed)) {
    allowedList.push(new Types.ObjectId(allowed).toString());
  }

  if (!allowedList.includes(branchId)) {
    throw createError('Access denied. You can only access your assigned branch.', 403);
  }
}
