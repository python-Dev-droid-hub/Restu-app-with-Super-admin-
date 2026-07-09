import { processScheduledAnnouncements } from './announcementDelivery.service';
import { logger } from '@/utils/logger';

const INTERVAL_MS = 60_000;
let timer: ReturnType<typeof setInterval> | null = null;

export function startAnnouncementScheduler() {
  if (timer) return;
  timer = setInterval(async () => {
    try {
      const count = await processScheduledAnnouncements();
      if (count > 0) logger.info(`[Announcement Scheduler] Sent ${count} scheduled announcement(s)`);
    } catch (err) {
      logger.error('[Announcement Scheduler] Error:', err);
    }
  }, INTERVAL_MS);
  logger.info('[Announcement Scheduler] Started (checks every 60s)');
}

export function stopAnnouncementScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
