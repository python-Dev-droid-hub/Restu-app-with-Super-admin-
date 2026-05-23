import { Types } from 'mongoose';

/** Match orders whether rider was stored as ObjectId or string. */
export function buildRiderOrderFilter(riderId: string): { rider: { $in: (Types.ObjectId | string)[] } } {
  const id = String(riderId || '').trim();
  const inList: (Types.ObjectId | string)[] = [];
  if (id) inList.push(id);
  if (Types.ObjectId.isValid(id)) inList.push(new Types.ObjectId(id));
  return { rider: { $in: inList } };
}
