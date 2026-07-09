import mongoose, { type ClientSession } from 'mongoose';
import { User } from '@/models/User';
import {
  Tenant,
  TenantBranch,
  OnboardingSteps,
  Subscription,
  Plan,
} from '@/superadmin/models';
import { validateSlug, slugifyName } from '@/superadmin/utils/slugValidator';
import { generateTempPassword, logTenantActivity, getTenantUrl } from '@/superadmin/utils/helpers';
import { sendWelcomeEmail } from '@/superadmin/services/emailNotification.service';
import { getPlatformSettings } from '@/superadmin/services/platformSettings.service';
import { provisionTenantLegacyBranches } from '@/superadmin/services/tenantBranchProvision.service';
import { notifyTenantLaunched, notifyDashboardRefresh } from '@/superadmin/services/superadminRealtime.service';
import { createError } from '@/utils';
import { isValidPhoneNumber, normalizePhoneNumber } from '@/utils/phone';

export interface LaunchTenantInput {
  name: string;
  slug?: string;
  legalName?: string;
  businessType?: string;
  cuisineType?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  city?: string;
  country?: string;
  planId: string;
  billingCycle?: 'MONTHLY' | 'YEARLY';
  enableTrial?: boolean;
  trialDays?: number;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  branch: {
    name: string;
    addressLine: string;
    city?: string;
    area?: string;
    phone?: string;
    email?: string;
    lat?: number;
    lng?: number;
    openingTime?: string;
    closingTime?: string;
    deliveryRadiusKm?: number;
  };
  launchedBy?: string;
}

let transactionsSupported: boolean | null = null;

/** MongoDB transactions need a replica set; local dev often uses standalone. */
async function mongoTransactionsSupported(): Promise<boolean> {
  if (transactionsSupported !== null) return transactionsSupported;
  try {
    const db = mongoose.connection.db;
    if (!db) {
      transactionsSupported = false;
      return false;
    }
    const status = await db.admin().command({ hello: 1 });
    transactionsSupported = Boolean(status.setName || status.msg === 'isdbgrid');
    return transactionsSupported;
  } catch {
    transactionsSupported = false;
    return false;
  }
}

type LaunchResult = {
  tenant: InstanceType<typeof Tenant>;
  branch: InstanceType<typeof TenantBranch>;
  ownerUser: InstanceType<typeof User>;
  tempPassword: string;
  slug: string;
  plan: InstanceType<typeof Plan>;
};

async function createTenantRecords(
  input: LaunchTenantInput,
  plan: InstanceType<typeof Plan>,
  tempPassword: string,
  trialDays: number,
  enableTrial: boolean,
  session?: ClientSession
): Promise<LaunchResult> {
  const slug = input.slug || slugifyName(input.name);
  const sessionOpts = session ? { session } : undefined;
  const trialEndsAt = enableTrial
    ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
    : undefined;

  const [tenant] = await Tenant.create(
    [
      {
        slug,
        name: input.name,
        legalName: input.legalName,
        logoUrl: input.logoUrl,
        faviconUrl: input.faviconUrl,
        primaryColor: input.primaryColor,
        secondaryColor: input.secondaryColor,
        ownerName: input.ownerName,
        ownerEmail: input.ownerEmail.toLowerCase(),
        ownerPhone: input.ownerPhone,
        businessType: input.businessType || 'RESTAURANT',
        cuisineType: input.cuisineType,
        city: input.city,
        country: input.country || 'Pakistan',
        planId: plan._id,
        billingCycle: input.billingCycle || 'MONTHLY',
        subscriptionStatus: enableTrial ? 'TRIAL' : 'ACTIVE',
        trialEndsAt,
        subscriptionStartsAt: enableTrial ? undefined : new Date(),
        launchedBy: input.launchedBy,
      },
    ],
    sessionOpts
  );

  const [branch] = await TenantBranch.create(
    [
      {
        tenantId: tenant._id,
        name: input.branch.name,
        addressLine: input.branch.addressLine,
        city: input.branch.city || input.city,
        area: input.branch.area,
        phone: input.branch.phone || input.ownerPhone,
        email: input.branch.email || input.ownerEmail,
        lat: input.branch.lat,
        lng: input.branch.lng,
        openingTime: input.branch.openingTime || '09:00',
        closingTime: input.branch.closingTime || '23:00',
        deliveryRadiusKm: input.branch.deliveryRadiusKm ?? 10,
      },
    ],
    sessionOpts
  );

  const [ownerUser] = await User.create(
    [
      {
        email: input.ownerEmail.toLowerCase(),
        passwordHash: tempPassword,
        displayName: input.ownerName,
        phoneNumber: input.ownerPhone,
        role: 'ADMIN',
        emailVerified: true,
        isActive: true,
        tenantId: tenant._id,
      },
    ],
    sessionOpts
  );

  tenant.ownerUserId = ownerUser._id;
  await tenant.save(sessionOpts);

  await OnboardingSteps.create(
    [
      {
        tenantId: tenant._id,
        stepProfileComplete: true,
        stepBranchCreated: true,
      },
    ],
    sessionOpts
  );

  const amount =
    input.billingCycle === 'YEARLY' ? plan.priceYearly || plan.priceMonthly * 12 : plan.priceMonthly;

  const endsAt = new Date();
  if (input.billingCycle === 'YEARLY') {
    endsAt.setFullYear(endsAt.getFullYear() + 1);
  } else {
    endsAt.setMonth(endsAt.getMonth() + 1);
  }

  await Subscription.create(
    [
      {
        tenantId: tenant._id,
        planId: plan._id,
        amount,
        billingCycle: input.billingCycle || 'MONTHLY',
        status: 'ACTIVE',
        startedAt: new Date(),
        endsAt: enableTrial ? trialEndsAt! : endsAt,
      },
    ],
    sessionOpts
  );

  return { tenant, branch, ownerUser, tempPassword, slug, plan };
}

async function finalizeLaunch(
  input: LaunchTenantInput,
  result: LaunchResult
) {
  await logTenantActivity(String(result.tenant._id), 'TENANT_LAUNCHED', {
    performedBy: input.launchedBy,
    description: `Restaurant "${input.name}" launched at ${result.slug}`,
    metadata: {
      slug: result.slug,
      planId: String(result.plan._id),
      branchId: String(result.branch._id),
    },
  });

  void sendWelcomeEmail({
    ownerEmail: input.ownerEmail,
    ownerName: input.ownerName,
    restaurantName: input.name,
    slug: result.slug,
    tempPassword: result.tempPassword,
    loginUrl: getTenantUrl(result.slug),
  });

  notifyTenantLaunched({ _id: result.tenant._id, name: result.tenant.name, slug: result.slug });
  notifyDashboardRefresh();
  void provisionTenantLegacyBranches(String(result.tenant._id));

  return {
    tenant: result.tenant,
    branch: result.branch,
    ownerUser: result.ownerUser.getPublicProfile(),
    tempPassword: result.tempPassword,
    loginUrl: getTenantUrl(result.slug),
  };
}

export async function launchTenant(input: LaunchTenantInput) {
  const slug = input.slug || slugifyName(input.name);
  const slugCheck = validateSlug(slug);
  if (!slugCheck.valid) throw createError(slugCheck.error!, 400);

  if (!input.planId || !mongoose.Types.ObjectId.isValid(input.planId)) {
    throw createError('A valid subscription plan must be selected.', 400);
  }

  const plan = await Plan.findById(input.planId);
  if (!plan || !plan.isActive) throw createError('Invalid or inactive plan.', 400);

  const existingSlug = await Tenant.findOne({ slug });
  if (existingSlug) throw createError('This subdomain slug is already taken.', 409);

  const existingEmail = await Tenant.findOne({ ownerEmail: input.ownerEmail.toLowerCase() });
  if (existingEmail) throw createError('A tenant with this owner email already exists.', 409);

  const existingUser = await User.findOne({ email: input.ownerEmail.toLowerCase() });
  if (existingUser) throw createError('A user with this email already exists.', 409);

  const ownerPhone = normalizePhoneNumber(input.ownerPhone);
  if (!isValidPhoneNumber(input.ownerPhone)) {
    throw createError('Please enter a valid phone number (e.g. 03001234567 or +923001234567).', 400);
  }

  const tempPassword = generateTempPassword();
  const platformSettings = await getPlatformSettings();
  const trialDays = input.trialDays ?? platformSettings.trialPeriodDays ?? 14;
  const enableTrial = input.enableTrial !== false;

  const payload = { ...input, slug, ownerPhone };

  if (await mongoTransactionsSupported()) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const result = await createTenantRecords(payload, plan, tempPassword, trialDays, enableTrial, session);
      await session.commitTransaction();
      return finalizeLaunch(payload, result);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  const result = await createTenantRecords(payload, plan, tempPassword, trialDays, enableTrial);
  return finalizeLaunch(payload, result);
}
