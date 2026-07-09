import { Tenant, TenantBranch } from '@/superadmin/models';
import { Branch } from '@/models/Branch';

function branchCodeFromSlug(slug: string, index: number): string {
  const letters = slug.replace(/[^a-z]/gi, '').toUpperCase();
  const prefix = (letters.slice(0, 2) || 'TN').padEnd(2, 'X');
  return `${prefix}${String(index + 1).padStart(3, '0')}`;
}

/** Create legacy Branch records for each SaaS TenantBranch so the admin app is tenant-isolated. */
export async function provisionTenantLegacyBranches(tenantId: string): Promise<void> {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) return;

  const tenantBranches = await TenantBranch.find({ tenantId: tenant._id });
  let index = 0;

  for (const tb of tenantBranches) {
    const existing = await Branch.findOne({
      $or: [{ saasTenantBranchId: tb._id }, { tenantId: tenant._id, branchName: tb.name }],
    });

    if (existing) {
      let dirty = false;
      if (!existing.tenantId) {
        existing.tenantId = tenant._id as any;
        dirty = true;
      }
      if (!existing.saasTenantBranchId) {
        existing.saasTenantBranchId = tb._id as any;
        dirty = true;
      }
      if (dirty) await existing.save();
      index += 1;
      continue;
    }

    let code = branchCodeFromSlug(tenant.slug, index);
    while (await Branch.findOne({ branchCode: code })) {
      index += 1;
      code = branchCodeFromSlug(tenant.slug, index);
    }

    const lat = tb.lat ?? 31.5204;
    const lng = tb.lng ?? 74.3587;

    await Branch.create({
      tenantId: tenant._id,
      saasTenantBranchId: tb._id,
      branchCode: code,
      branchName: tb.name,
      addressLine: tb.addressLine,
      city: tb.city || tenant.city || 'Lahore',
      country: tenant.country || 'Pakistan',
      lat,
      lng,
      location: { type: 'Point', coordinates: [lng, lat] },
      phoneNumber: tb.phone || tenant.ownerPhone,
      email: tb.email || tenant.ownerEmail,
      isActive: tb.isActive !== false,
      acceptsDelivery: true,
      acceptsDineIn: true,
      acceptsTakeaway: true,
    });
    index += 1;
  }
}
