/**
 * Weekly orchestrator — Monday 9AM Vietnam (02:00 UTC).
 *
 * Steps:
 *   1. Sync campaigns from Accesstrade → src/content/affiliate-links/*.yaml
 *   2. Find top hot campaigns (filtered by rules)
 *   3. For each: draft review post via Claude → src/content/posts/{cluster}/review/*.mdx
 *   4. Git: create branch "auto-draft/{date}", commit all changes
 *   5. (In GitHub Action) push branch + open PR
 *   6. Send Telegram notification with PR link
 *
 * Safety:
 *   - AUTO_DRAFT_ENABLED env can kill switch the whole pipeline
 *   - Max drafts per run capped by env
 *   - All posts default draft: true
 */
import { env } from '../shared/env';
import { createLogger } from '../shared/logger';
import { gitAdd, gitCheckoutBranch, gitCommit, gitHasChanges, isoDate, repoPath } from './utils';
import { writeJson, readJsonSafe } from './utils';
import { syncCampaigns } from '../accesstrade/sync-campaigns';
import { findHotCampaigns } from '../accesstrade/find-hot';
import { draftReview, type DraftResult } from '../content/draft-post';
import { sendTelegram } from '../notify/telegram';
import { formatWeeklyDraftMessage, formatErrorMessage } from '../notify/format-message';

const log = createLogger('weekly-draft');

const SEEN_FILE = repoPath('data/seen-campaigns.json');
const HISTORY_FILE = repoPath('data/auto-draft-history.json');

interface SeenRecord {
  campaignId: string;
  slug: string;
  brand: string;
  lastSynced: string;
  hasPost: boolean;
}

interface SeenCampaigns {
  campaigns: Record<string, SeenRecord>;
}

interface AutoDraftHistoryEntry {
  date: string;
  branch: string;
  drafts: Array<{
    campaignId: string;
    slug: string;
    cluster: string;
    filePath: string;
    validationOk: boolean;
    costUsd: number;
  }>;
  totalCostUsd: number;
}

interface AutoDraftHistory {
  runs: AutoDraftHistoryEntry[];
}

async function recordHistory(entry: AutoDraftHistoryEntry): Promise<void> {
  const history = await readJsonSafe<AutoDraftHistory>(HISTORY_FILE, { runs: [] });
  history.runs.unshift(entry);
  // Keep last 52 runs (~1 year of weekly runs)
  history.runs = history.runs.slice(0, 52);
  await writeJson(HISTORY_FILE, history);
}

async function markPostsCreated(drafts: DraftResult[]): Promise<void> {
  const seen = await readJsonSafe<SeenCampaigns>(SEEN_FILE, { campaigns: {} });
  for (const d of drafts) {
    const existing = seen.campaigns[d.campaignId];
    seen.campaigns[d.campaignId] = {
      campaignId: d.campaignId,
      slug: d.slug,
      brand: existing?.brand ?? '',
      lastSynced: existing?.lastSynced ?? new Date().toISOString(),
      hasPost: true,
    };
  }
  await writeJson(SEEN_FILE, seen);
}

export interface WeeklyDraftResult {
  enabled: boolean;
  branchName: string | null;
  campaignsSynced: number;
  hotCandidates: number;
  drafts: DraftResult[];
  totalCostUsd: number;
  prUrlPlaceholder: string | null;
}

export async function runWeeklyDraft(): Promise<WeeklyDraftResult> {
  if (!env.AUTO_DRAFT_ENABLED) {
    log.warn('AUTO_DRAFT_ENABLED=false, skipping');
    return {
      enabled: false,
      branchName: null,
      campaignsSynced: 0,
      hotCandidates: 0,
      drafts: [],
      totalCostUsd: 0,
      prUrlPlaceholder: null,
    };
  }

  const date = isoDate();
  const branchName = `auto-draft/${date}`;

  // 1. Sync campaigns
  log.info('Step 1: Sync campaigns');
  const syncResult = await syncCampaigns();

  // 2. Find hot candidates
  log.info('Step 2: Find hot campaigns');
  const hot = await findHotCampaigns();
  log.info(`Found ${hot.length} hot candidates`);

  if (hot.length === 0) {
    log.warn('No hot candidates this run');
    return {
      enabled: true,
      branchName: null,
      campaignsSynced: syncResult.added + syncResult.updated,
      hotCandidates: 0,
      drafts: [],
      totalCostUsd: 0,
      prUrlPlaceholder: null,
    };
  }

  // 3. Git branch
  log.info(`Step 3: Create branch ${branchName}`);
  try {
    gitCheckoutBranch(branchName, 'main');
  } catch (err) {
    log.warn('Branch operation failed (may already exist)', {
      error: (err as Error).message,
    });
  }

  // 4. Generate drafts
  log.info(`Step 4: Draft ${hot.length} posts`);
  const drafts: DraftResult[] = [];
  for (const candidate of hot) {
    try {
      const result = await draftReview(candidate);
      drafts.push(result);
    } catch (err) {
      log.error(`Draft failed for ${candidate.campaign.slug}`, {
        error: (err as Error).message,
      });
    }
  }

  const totalCost = drafts.reduce((sum, d) => sum + d.costUsd, 0);

  if (drafts.length === 0) {
    log.error('All drafts failed');
    return {
      enabled: true,
      branchName: null,
      campaignsSynced: syncResult.added + syncResult.updated,
      hotCandidates: hot.length,
      drafts: [],
      totalCostUsd: 0,
      prUrlPlaceholder: null,
    };
  }

  // 5. Mark posts as created in seen registry
  await markPostsCreated(drafts);

  // 6. Commit changes
  if (gitHasChanges()) {
    log.info('Step 6: Commit changes');
    gitAdd([
      'src/content/posts/',
      'src/content/products/',
      'src/content/affiliate-links/',
      'data/seen-campaigns.json',
    ]);
    gitCommit(
      `auto-draft: ${drafts.length} review(s) — ${date}\n\n${drafts
        .map((d) => `- ${d.slug} (${d.cluster})`)
        .join('\n')}\n\nGenerated by weekly automation pipeline. All posts default to draft: true.`,
    );
  } else {
    log.warn('No git changes detected');
  }

  // 7. Record history
  await recordHistory({
    date,
    branch: branchName,
    drafts: drafts.map((d) => ({
      campaignId: d.campaignId,
      slug: d.slug,
      cluster: d.cluster,
      filePath: d.filePath,
      validationOk: d.validation.ok,
      costUsd: d.costUsd,
    })),
    totalCostUsd: totalCost,
  });

  return {
    enabled: true,
    branchName,
    campaignsSynced: syncResult.added + syncResult.updated,
    hotCandidates: hot.length,
    drafts,
    totalCostUsd: totalCost,
    prUrlPlaceholder: null, // populated by GitHub Action after PR is created
  };
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  runWeeklyDraft()
    .then(async (result) => {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(result, null, 2));

      // Send notification
      const prUrl = process.env.GITHUB_PR_URL ?? null;
      await sendTelegram({
        text: formatWeeklyDraftMessage({
          drafts: result.drafts,
          prUrl: prUrl ?? undefined,
          date: isoDate(),
          totalCostUsd: result.totalCostUsd,
        }),
      });

      process.exit(0);
    })
    .catch(async (err) => {
      log.error('Fatal', { error: (err as Error).message });
      await sendTelegram({ text: formatErrorMessage('weekly-draft', err as Error) });
      process.exit(1);
    });
}
