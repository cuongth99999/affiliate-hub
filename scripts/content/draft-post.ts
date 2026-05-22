/**
 * Generate a single review post MDX for a campaign.
 *
 * Flow:
 *   1. Ensure product YAML exists (auto-generate if not)
 *   2. Call Claude with review template
 *   3. Validate output
 *   4. Write to src/content/posts/{cluster}/review/{slug}.mdx
 *
 * Returns metadata for the orchestrator (PR creation, notify).
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { createLogger } from '../shared/logger';
import { repoPath, isoDate } from '../pipeline/utils';
import { generate } from './claude-client';
import { ensureProductYaml } from './draft-product-yaml';
import { validatePostMdx, type ValidationResult } from './post-validator';
import type { HotCandidate } from '../accesstrade/find-hot';

const log = createLogger('draft-post');

const POSTS_DIR = repoPath('src/content/posts');

export interface DraftResult {
  campaignId: string;
  slug: string;
  cluster: string;
  filePath: string;
  postUrl: string;
  validation: ValidationResult;
  costUsd: number;
}

export async function draftReview(candidate: HotCandidate): Promise<DraftResult> {
  const { campaign, cluster } = candidate;
  log.info(`Drafting review for ${campaign.brand} - ${campaign.name}`);

  // 1. Ensure product YAML
  await ensureProductYaml(campaign);

  // 2. Generate review draft
  const result = await generate({
    prompt: 'review',
    variables: {
      product_name: campaign.name,
      brand: campaign.brand,
      product_type: campaign.category,
      payout_vnd: campaign.payoutVnd ?? 0,
      payout_type: campaign.payoutType,
      cookie_days: campaign.cookieDays ?? 30,
      description: campaign.description ?? '',
      official_url: campaign.targetUrl,
      product_slug: campaign.slug,
      affiliate_slug: campaign.slug,
      cluster,
      today_date: isoDate(),
    },
  });

  // 3. Strip any wrapping code fences
  let mdx = result.text.trim();
  mdx = mdx.replace(/^```(?:mdx|markdown)?\n?/i, '').replace(/\n?```$/, '');

  // 4. Validate
  const validation = validatePostMdx(mdx);
  if (!validation.ok) {
    log.error(`Validation failed for ${campaign.slug}`, { errors: validation.errors });
    // Still write to file so human can fix — but flag with .invalid suffix
  }
  if (validation.warnings.length > 0) {
    log.warn(`Validation warnings for ${campaign.slug}`, { warnings: validation.warnings });
  }

  // 5. Write to filesystem
  const targetDir = path.join(POSTS_DIR, cluster, 'review');
  if (!existsSync(targetDir)) await mkdir(targetDir, { recursive: true });
  const filePath = path.join(targetDir, `${campaign.slug}.mdx`);
  await writeFile(filePath, mdx.endsWith('\n') ? mdx : mdx + '\n', 'utf-8');

  log.success(`Wrote draft: ${filePath}`, {
    cost: `$${result.usage.estimatedCostUsd.toFixed(4)}`,
  });

  return {
    campaignId: campaign.id,
    slug: campaign.slug,
    cluster,
    filePath: path.relative(repoPath(), filePath),
    postUrl: `/${cluster}/review/${campaign.slug}/`,
    validation,
    costUsd: result.usage.estimatedCostUsd,
  };
}

// CLI entry — manual draft for a specific campaign (debug)
if (import.meta.url === `file://${process.argv[1]}`) {
  // Usage: pnpm draft:one <campaignId>
  const campaignId = process.argv[2];
  if (!campaignId) {
    log.error('Usage: pnpm draft:one <campaignId>');
    process.exit(1);
  }

  import('../accesstrade/find-hot')
    .then(async ({ findHotCampaigns }) => {
      const all = await findHotCampaigns({ maxPerRun: 100, skipIfPostExists: false });
      const target = all.find((c) => c.campaign.id === campaignId);
      if (!target) {
        log.error(`Campaign ${campaignId} not found in hot list`);
        process.exit(1);
      }
      const r = await draftReview(target);
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(r, null, 2));
    })
    .catch((err) => {
      log.error('Fatal', { error: (err as Error).message });
      process.exit(1);
    });
}
