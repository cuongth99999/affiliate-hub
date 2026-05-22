/**
 * Sync Accesstrade campaigns → src/content/affiliate-links/*.yaml
 *
 * For each active campaign with target URL:
 *   - Generate slug + tracking deeplink
 *   - Write/update yaml file
 *   - Track in data/seen-campaigns.json
 *
 * Idempotent: re-running won't create duplicates.
 * Outputs summary stats for the pipeline orchestrator.
 */
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { createLogger } from '../shared/logger';
import { repoPath, readJsonSafe, writeJson } from '../pipeline/utils';
import { listNormalizedCampaigns, createProductLink } from './client';
import type { NormalizedCampaign } from './types';

const log = createLogger('sync-campaigns');

const AFFILIATE_LINKS_DIR = repoPath('src/content/affiliate-links');
const SEEN_CAMPAIGNS_FILE = repoPath('data/seen-campaigns.json');

interface SeenCampaignRecord {
  campaignId: string;
  slug: string;
  brand: string;
  lastSynced: string;
  hasPost: boolean;
}

interface SeenCampaigns {
  campaigns: Record<string, SeenCampaignRecord>;
}

export interface SyncResult {
  total: number;
  active: number;
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
}

function toYaml(record: {
  target_url: string;
  network: string;
  campaign_id: string;
  payout_vnd?: number;
  payout_percent?: number;
  payout_type: string;
  product_slug?: string;
  active: boolean;
  note?: string;
}): string {
  const lines: string[] = [];
  lines.push(`target_url: ${JSON.stringify(record.target_url)}`);
  lines.push(`network: ${JSON.stringify(record.network)}`);
  lines.push(`campaign_id: ${JSON.stringify(record.campaign_id)}`);
  if (record.payout_vnd !== undefined) lines.push(`payout_vnd: ${record.payout_vnd}`);
  if (record.payout_percent !== undefined) lines.push(`payout_percent: ${record.payout_percent}`);
  lines.push(`payout_type: ${JSON.stringify(record.payout_type)}`);
  if (record.product_slug) lines.push(`product_slug: ${JSON.stringify(record.product_slug)}`);
  lines.push(`active: ${record.active}`);
  if (record.note) lines.push(`note: ${JSON.stringify(record.note)}`);
  return lines.join('\n') + '\n';
}

async function ensureDirs(): Promise<void> {
  if (!existsSync(AFFILIATE_LINKS_DIR)) await mkdir(AFFILIATE_LINKS_DIR, { recursive: true });
  const dataDir = path.dirname(SEEN_CAMPAIGNS_FILE);
  if (!existsSync(dataDir)) await mkdir(dataDir, { recursive: true });
}

async function syncSingleCampaign(
  campaign: NormalizedCampaign,
  seen: SeenCampaigns,
): Promise<'added' | 'updated' | 'skipped' | 'error'> {
  if (campaign.status !== 'active') {
    return 'skipped';
  }
  if (!campaign.targetUrl) {
    log.warn(`Skipped: no target URL`, { id: campaign.id, brand: campaign.brand });
    return 'skipped';
  }

  // Resolve deeplink for tracking (falls back to raw URL if API fails)
  const deeplink = await createProductLink({
    campaign_id: campaign.id,
    urls: [campaign.targetUrl],
    utm_source: 'affiliate-hub',
    utm_medium: 'organic',
  });
  const trackingUrl = deeplink?.success_link?.[0]?.aff_link ?? campaign.targetUrl;

  const yamlFile = path.join(AFFILIATE_LINKS_DIR, `${campaign.slug}.yaml`);
  const isNew = !existsSync(yamlFile);

  const yaml = toYaml({
    target_url: trackingUrl,
    network: 'accesstrade',
    campaign_id: campaign.id,
    payout_vnd: campaign.payoutVnd,
    payout_percent: campaign.payoutPercent,
    payout_type: campaign.payoutType,
    product_slug: campaign.slug,
    active: true,
    note: `Auto-synced ${new Date().toISOString().split('T')[0]} from Accesstrade`,
  });

  await writeFile(yamlFile, yaml, 'utf-8');

  // Update seen registry
  const existing = seen.campaigns[campaign.id];
  seen.campaigns[campaign.id] = {
    campaignId: campaign.id,
    slug: campaign.slug,
    brand: campaign.brand,
    lastSynced: new Date().toISOString(),
    hasPost: existing?.hasPost ?? false,
  };

  return isNew ? 'added' : 'updated';
}

export async function syncCampaigns(): Promise<SyncResult> {
  await ensureDirs();
  const seen = await readJsonSafe<SeenCampaigns>(SEEN_CAMPAIGNS_FILE, { campaigns: {} });

  log.info('Starting campaign sync');
  const campaigns = await listNormalizedCampaigns();
  const active = campaigns.filter((c) => c.status === 'active');
  log.info(`Fetched ${campaigns.length} campaigns (${active.length} active)`);

  const result: SyncResult = {
    total: campaigns.length,
    active: active.length,
    added: 0,
    updated: 0,
    skipped: campaigns.length - active.length,
    errors: [],
  };

  for (const campaign of active) {
    try {
      const outcome = await syncSingleCampaign(campaign, seen);
      if (outcome === 'added') result.added++;
      else if (outcome === 'updated') result.updated++;
      else result.skipped++;
    } catch (err) {
      const msg = `${campaign.brand} (${campaign.id}): ${(err as Error).message}`;
      log.error(msg);
      result.errors.push(msg);
    }
  }

  await writeJson(SEEN_CAMPAIGNS_FILE, seen);

  log.success('Campaign sync complete', {
    added: result.added,
    updated: result.updated,
    skipped: result.skipped,
    errors: result.errors.length,
  });

  return result;
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  syncCampaigns()
    .then((r) => {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(r, null, 2));
      process.exit(r.errors.length > 0 ? 1 : 0);
    })
    .catch((err) => {
      log.error('Fatal', { error: (err as Error).message });
      process.exit(1);
    });
}
