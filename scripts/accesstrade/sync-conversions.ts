/**
 * Sync Accesstrade conversion stats → Cloudflare D1
 *
 * Runs weekly via cron. Pulls last 7 days of conversions, upserts into:
 *   - conversion_raw (each conversion record)
 *   - conversion_stats (aggregated per campaign per day)
 *
 * Uses wrangler CLI to execute SQL against remote D1 database.
 * Requires CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN env vars.
 */
import { spawnSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createLogger } from '../shared/logger';
import { isoDate, daysAgo, repoPath } from '../pipeline/utils';
import { listTransactions } from './client';
import type { AccesstradeTransaction } from './types';

const log = createLogger('sync-conversions');

const D1_DB_NAME = 'affiliate-hub-clicks';
const TMP_SQL_DIR = repoPath('.tmp');

interface DailyAggregate {
  campaignId: string;
  date: string;
  clickCount: number;
  conversionCount: number;
  payoutPending: number;
  payoutApproved: number;
  payoutRejected: number;
}

/**
 * Resolve a stable campaign identifier from a transaction record.
 * Accesstrade's /transactions response uses `merchant` more reliably than
 * `campaign_id` (which is optional). Fall back to merchant when missing.
 */
function campaignKey(t: AccesstradeTransaction): string {
  return t.campaign_id ?? t.merchant ?? 'unknown';
}

function aggregate(transactions: AccesstradeTransaction[]): DailyAggregate[] {
  const map = new Map<string, DailyAggregate>();

  for (const t of transactions) {
    if (!t.transaction_time) continue;
    const date = t.transaction_time.split('T')[0]!;
    const campaignId = campaignKey(t);
    const key = `${campaignId}::${date}`;
    const agg = map.get(key) ?? {
      campaignId,
      date,
      clickCount: 0,
      conversionCount: 0,
      payoutPending: 0,
      payoutApproved: 0,
      payoutRejected: 0,
    };
    agg.conversionCount += 1;
    const amount = t.commission ?? 0;
    // status: 0=pending/hold, 1=approved, 2=rejected
    if (t.status === 0) agg.payoutPending += amount;
    else if (t.status === 1) agg.payoutApproved += amount;
    else if (t.status === 2) agg.payoutRejected += amount;
    map.set(key, agg);
  }

  return Array.from(map.values());
}

function sqlEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return value.toString();
  return `'${value.replace(/'/g, "''")}'`;
}

const STATUS_LABEL: Record<number, string> = {
  0: 'pending',
  1: 'approved',
  2: 'rejected',
};

function buildRawInsertSql(transactions: AccesstradeTransaction[]): string {
  const lines: string[] = [];
  for (const t of transactions) {
    const statusLabel = STATUS_LABEL[t.status] ?? `unknown(${t.status})`;
    lines.push(
      `INSERT INTO conversion_raw (accesstrade_id, campaign_id, click_id, order_id, click_time, conversion_time, sales_amount, commission_vnd, status, utm_source, utm_medium, utm_campaign) VALUES (${sqlEscape(t.transaction_id)}, ${sqlEscape(campaignKey(t))}, ${sqlEscape(null)}, ${sqlEscape(t.transaction_id ?? null)}, ${sqlEscape(t.click_time ?? null)}, ${sqlEscape(t.transaction_time ?? null)}, ${sqlEscape(t.transaction_value ?? null)}, ${sqlEscape(t.commission ?? null)}, ${sqlEscape(statusLabel)}, ${sqlEscape(t.utm_source ?? null)}, ${sqlEscape(t.utm_medium ?? null)}, ${sqlEscape(t.utm_campaign ?? null)}) ON CONFLICT(accesstrade_id) DO UPDATE SET status = excluded.status, commission_vnd = excluded.commission_vnd, synced_at = CURRENT_TIMESTAMP;`,
    );
  }
  return lines.join('\n');
}

function buildStatsUpsertSql(aggs: DailyAggregate[]): string {
  const lines: string[] = [];
  for (const a of aggs) {
    lines.push(
      `INSERT INTO conversion_stats (campaign_id, conversion_date, conversion_count, payout_pending_vnd, payout_approved_vnd, payout_rejected_vnd) VALUES (${sqlEscape(a.campaignId)}, ${sqlEscape(a.date)}, ${a.conversionCount}, ${a.payoutPending}, ${a.payoutApproved}, ${a.payoutRejected}) ON CONFLICT(campaign_id, conversion_date) DO UPDATE SET conversion_count = excluded.conversion_count, payout_pending_vnd = excluded.payout_pending_vnd, payout_approved_vnd = excluded.payout_approved_vnd, payout_rejected_vnd = excluded.payout_rejected_vnd, synced_at = CURRENT_TIMESTAMP;`,
    );
  }
  return lines.join('\n');
}

async function executeOnD1(sql: string): Promise<void> {
  if (!existsSync(TMP_SQL_DIR)) await mkdir(TMP_SQL_DIR, { recursive: true });
  const sqlFile = path.join(TMP_SQL_DIR, `sync-${Date.now()}.sql`);
  await writeFile(sqlFile, sql, 'utf-8');

  const result = spawnSync(
    'pnpm',
    ['exec', 'wrangler', 'd1', 'execute', D1_DB_NAME, '--remote', `--file=${sqlFile}`],
    { stdio: 'inherit', cwd: repoPath() },
  );

  if (result.status !== 0) {
    throw new Error(`wrangler d1 execute failed with code ${result.status}`);
  }
}

export interface ConversionSyncResult {
  daysSynced: number;
  totalConversions: number;
  totalCommissionVnd: number;
  byStatus: Record<string, number>;
}

export async function syncConversions(days = 7): Promise<ConversionSyncResult> {
  const now = new Date();
  const sinceDate = daysAgo(days);
  const sinceIso = sinceDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const untilIso = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
  log.info(`Syncing transactions ${sinceIso} → ${untilIso}`);

  const transactions = await listTransactions({ sinceIso, untilIso });
  log.info(`Fetched ${transactions.length} transaction records`);

  if (transactions.length === 0) {
    return {
      daysSynced: days,
      totalConversions: 0,
      totalCommissionVnd: 0,
      byStatus: {},
    };
  }

  const aggregates = aggregate(transactions);

  const rawSql = buildRawInsertSql(transactions);
  const statsSql = buildStatsUpsertSql(aggregates);
  const fullSql = `BEGIN TRANSACTION;\n${rawSql}\n${statsSql}\nCOMMIT;`;

  await executeOnD1(fullSql);

  const byStatus: Record<string, number> = {};
  let totalCommission = 0;
  for (const t of transactions) {
    const label = STATUS_LABEL[t.status] ?? `unknown(${t.status})`;
    byStatus[label] = (byStatus[label] ?? 0) + 1;
    totalCommission += t.commission ?? 0;
  }

  log.success('Transaction sync complete', { byStatus, totalCommission });

  return {
    daysSynced: days,
    totalConversions: transactions.length,
    totalCommissionVnd: totalCommission,
    byStatus,
  };
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  const days = parseInt(process.argv[2] ?? '7', 10);
  syncConversions(days)
    .then((r) => {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(r, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      log.error('Fatal', { error: (err as Error).message });
      process.exit(1);
    });
}
