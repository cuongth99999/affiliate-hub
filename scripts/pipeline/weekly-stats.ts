/**
 * Weekly stats orchestrator — Sunday 23:00 Vietnam (16:00 UTC).
 *
 * Pulls last 7 days conversions from Accesstrade → D1, then sends a
 * summary Telegram notification.
 */
import { createLogger } from '../shared/logger';
import { isoDate, daysAgo } from './utils';
import { syncConversions } from '../accesstrade/sync-conversions';
import { sendTelegram } from '../notify/telegram';
import { formatWeeklyStatsMessage, formatErrorMessage } from '../notify/format-message';

const log = createLogger('weekly-stats');

export async function runWeeklyStats(): Promise<void> {
  const weekEnd = isoDate();
  const weekStart = isoDate(daysAgo(7));

  log.info(`Running weekly stats sync ${weekStart} → ${weekEnd}`);
  const result = await syncConversions(7);

  await sendTelegram({
    text: formatWeeklyStatsMessage({
      syncResult: result,
      weekStart,
      weekEnd,
    }),
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runWeeklyStats()
    .then(() => process.exit(0))
    .catch(async (err) => {
      log.error('Fatal', { error: (err as Error).message });
      await sendTelegram({ text: formatErrorMessage('weekly-stats', err as Error) });
      process.exit(1);
    });
}
