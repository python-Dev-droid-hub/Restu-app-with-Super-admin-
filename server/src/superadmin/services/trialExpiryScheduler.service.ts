import { Tenant } from '@/superadmin/models';
import { sendTrialExpiryWarning } from './emailNotification.service';
import { logger } from '@/utils/logger';

const INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours
const WARNING_DAYS = 3;
let timer: ReturnType<typeof setInterval> | null = null;

export async function processTrialExpiryWarnings() {
  const now = new Date();
  const warningEnd = new Date(now);
  warningEnd.setDate(warningEnd.getDate() + WARNING_DAYS);

  const expiring = await Tenant.find({
    subscriptionStatus: 'TRIAL',
    isActive: true,
    trialEndsAt: { $gte: now, $lte: warningEnd },
    trialWarningSentAt: { $exists: false },
  }).limit(50);

  for (const tenant of expiring) {
    if (!tenant.ownerEmail) continue;
    const daysRemaining = Math.max(
      1,
      Math.ceil((tenant.trialEndsAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    );
    try {
      await sendTrialExpiryWarning(
        tenant.ownerEmail,
        tenant.ownerName || 'Owner',
        tenant.name,
        daysRemaining
      );
      tenant.trialWarningSentAt = new Date();
      await tenant.save();
    } catch (err) {
      logger.warn(`[Trial Expiry] Email failed for ${tenant.slug}: ${(err as Error).message}`);
    }
  }

  return expiring.length;
}

export function startTrialExpiryScheduler() {
  if (timer) return;
  timer = setInterval(async () => {
    try {
      const count = await processTrialExpiryWarnings();
      if (count > 0) logger.info(`[Trial Expiry] Sent ${count} warning(s)`);
    } catch (err) {
      logger.error('[Trial Expiry Scheduler] Error:', err);
    }
  }, INTERVAL_MS);
  void processTrialExpiryWarnings();
  logger.info('[Trial Expiry Scheduler] Started');
}
