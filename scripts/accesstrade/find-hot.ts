/**
 * Detect "hot" campaigns that deserve a fresh post.
 *
 * Reads:
 *   - data/seen-campaigns.json (which campaigns have posts already)
 *   - Live Accesstrade campaign list
 *
 * Filters by rules in HOT_RULES (see ACCESSTRADE_AUTOMATION.md §5).
 * Returns sorted candidates limited by env.AUTO_DRAFT_MAX_PER_RUN.
 */
import { readJsonSafe, repoPath, daysBetween } from '../pipeline/utils';
import { createLogger } from '../shared/logger';
import { env } from '../shared/env';
import { listNormalizedCampaigns } from './client';
import type { NormalizedCampaign } from './types';

const log = createLogger('find-hot');

const SEEN_CAMPAIGNS_FILE = repoPath('data/seen-campaigns.json');

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

export interface HotRules {
  minPayoutVnd: number;
  payoutTypes: NormalizedCampaign['payoutType'][];
  excludeCategories: string[];
  newSinceDays: number;
  excludeEndingDays: number;
  skipIfPostExists: boolean;
  maxPerRun: number;
  categoryMap: Record<string, string>;
}

export const HOT_RULES: HotRules = {
  minPayoutVnd: env.AUTO_DRAFT_MIN_PAYOUT_VND,
  payoutTypes: ['CPS', 'CPQL', 'percent', 'hybrid'],
  excludeCategories: [
    'gambling',
    'forex',
    'binary_options',
    'binary-options',
    'adult',
    'mlm',
    'crypto-trading-signal',
  ],
  newSinceDays: 60,
  excludeEndingDays: 14,
  skipIfPostExists: true,
  maxPerRun: env.AUTO_DRAFT_MAX_PER_RUN,
  categoryMap: {
    'credit-card': 'the-tin-dung',
    'credit_card': 'the-tin-dung',
    'banking': 'tai-khoan-ngan-hang',
    'bank-account': 'tai-khoan-ngan-hang',
    'e-wallet': 'tai-khoan-ngan-hang',
    'loan': 'vay-tieu-dung',
    'consumer-loan': 'vay-tieu-dung',
    'broker': 'chung-khoan',
    'securities': 'chung-khoan',
    'stock': 'chung-khoan',
    'crypto-exchange': 'crypto',
    'cryptocurrency': 'crypto',
    'insurance': 'bao-hiem',
  },
};

export interface HotCandidate {
  campaign: NormalizedCampaign;
  cluster: string;
  score: number;
  reasons: string[];
}

function resolveCluster(campaign: NormalizedCampaign, rules: HotRules): string | null {
  const cat = campaign.category.toLowerCase();
  // Exact match first
  if (rules.categoryMap[cat]) return rules.categoryMap[cat];
  // Fuzzy match: substring
  for (const [key, value] of Object.entries(rules.categoryMap)) {
    if (cat.includes(key) || key.includes(cat)) return value;
  }
  return null;
}

function isExcluded(campaign: NormalizedCampaign, rules: HotRules): string | null {
  const cat = campaign.category.toLowerCase();
  const name = campaign.name.toLowerCase();
  for (const blocked of rules.excludeCategories) {
    if (cat.includes(blocked) || name.includes(blocked)) {
      return `Category excluded: ${blocked}`;
    }
  }
  return null;
}

function computeScore(campaign: NormalizedCampaign): number {
  const payoutScore = (campaign.payoutVnd ?? 0) / 1000; // 100k → 100
  let recencyBonus = 1;
  if (campaign.startDate) {
    const days = daysBetween(new Date(), new Date(campaign.startDate));
    if (days <= 14) recencyBonus = 1.5;
    else if (days <= 30) recencyBonus = 1.3;
    else if (days <= 60) recencyBonus = 1.1;
  }
  return payoutScore * recencyBonus;
}

export async function findHotCampaigns(
  options: Partial<HotRules> = {},
): Promise<HotCandidate[]> {
  const rules: HotRules = { ...HOT_RULES, ...options };
  const seen = await readJsonSafe<SeenCampaigns>(SEEN_CAMPAIGNS_FILE, { campaigns: {} });

  log.info('Fetching campaigns to evaluate');
  const campaigns = await listNormalizedCampaigns();

  const candidates: HotCandidate[] = [];
  let rejectedCount = 0;
  const rejectionLog: Record<string, number> = {};

  for (const campaign of campaigns) {
    if (campaign.status !== 'active') {
      rejectionLog['inactive'] = (rejectionLog['inactive'] ?? 0) + 1;
      rejectedCount++;
      continue;
    }

    const excluded = isExcluded(campaign, rules);
    if (excluded) {
      rejectionLog[excluded] = (rejectionLog[excluded] ?? 0) + 1;
      rejectedCount++;
      continue;
    }

    if ((campaign.payoutVnd ?? 0) < rules.minPayoutVnd) {
      rejectionLog['payout_too_low'] = (rejectionLog['payout_too_low'] ?? 0) + 1;
      rejectedCount++;
      continue;
    }

    if (!rules.payoutTypes.includes(campaign.payoutType)) {
      rejectionLog['payout_type_excluded'] = (rejectionLog['payout_type_excluded'] ?? 0) + 1;
      rejectedCount++;
      continue;
    }

    if (campaign.endDate) {
      const endIn = daysBetween(new Date(), new Date(campaign.endDate));
      if (endIn < rules.excludeEndingDays) {
        rejectionLog['ending_soon'] = (rejectionLog['ending_soon'] ?? 0) + 1;
        rejectedCount++;
        continue;
      }
    }

    if (rules.skipIfPostExists && seen.campaigns[campaign.id]?.hasPost) {
      rejectionLog['post_exists'] = (rejectionLog['post_exists'] ?? 0) + 1;
      rejectedCount++;
      continue;
    }

    const cluster = resolveCluster(campaign, rules);
    if (!cluster) {
      rejectionLog['no_cluster_match'] = (rejectionLog['no_cluster_match'] ?? 0) + 1;
      rejectedCount++;
      continue;
    }

    candidates.push({
      campaign,
      cluster,
      score: computeScore(campaign),
      reasons: [
        `Payout: ${campaign.payoutVnd?.toLocaleString('vi-VN')} VND`,
        `Category fits cluster: ${cluster}`,
        `Active campaign`,
      ],
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, rules.maxPerRun);

  log.info(`Evaluated ${campaigns.length} campaigns`, {
    accepted: candidates.length,
    rejected: rejectedCount,
    rejections: rejectionLog,
    returning: top.length,
  });

  return top;
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  findHotCampaigns()
    .then((hot) => {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(
        hot.map((c) => ({
          id: c.campaign.id,
          slug: c.campaign.slug,
          name: c.campaign.name,
          brand: c.campaign.brand,
          payoutVnd: c.campaign.payoutVnd,
          cluster: c.cluster,
          score: c.score,
        })),
        null,
        2,
      ));
      process.exit(0);
    })
    .catch((err) => {
      log.error('Fatal', { error: (err as Error).message });
      process.exit(1);
    });
}
