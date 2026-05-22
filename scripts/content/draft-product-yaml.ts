/**
 * Generate src/content/products/{slug}.yaml from an Accesstrade campaign.
 * Calls Claude to fill in market-realistic specs/pros/cons.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { createLogger } from '../shared/logger';
import { repoPath, isoDate } from '../pipeline/utils';
import { generate } from './claude-client';
import type { NormalizedCampaign } from '../accesstrade/types';

const log = createLogger('draft-product');

const PRODUCTS_DIR = repoPath('src/content/products');

function guessProductType(campaign: NormalizedCampaign): string {
  const cat = campaign.category.toLowerCase();
  const name = campaign.name.toLowerCase();
  if (cat.includes('credit') || name.includes('credit') || name.includes('thẻ tín dụng'))
    return 'credit-card';
  if (cat.includes('loan') || name.includes('vay')) return 'loan';
  if (cat.includes('bank') || cat.includes('account')) return 'bank-account';
  if (cat.includes('wallet') || cat.includes('ví')) return 'wallet';
  if (cat.includes('broker') || cat.includes('chứng khoán')) return 'broker';
  if (cat.includes('crypto') || cat.includes('exchange')) return 'exchange';
  if (cat.includes('insurance') || cat.includes('bảo hiểm')) return 'insurance';
  return 'bank-account';
}

export async function ensureProductYaml(campaign: NormalizedCampaign): Promise<string> {
  if (!existsSync(PRODUCTS_DIR)) await mkdir(PRODUCTS_DIR, { recursive: true });

  const slug = campaign.slug;
  const filePath = path.join(PRODUCTS_DIR, `${slug}.yaml`);

  if (existsSync(filePath)) {
    log.info(`Product YAML exists, skipping: ${slug}`);
    return filePath;
  }

  log.info(`Generating product YAML for ${slug}`);

  const result = await generate({
    prompt: 'product-yaml',
    variables: {
      product_name: campaign.name,
      brand: campaign.brand,
      product_type: guessProductType(campaign),
      description: campaign.description ?? `${campaign.brand} ${campaign.name}`,
      official_url: campaign.targetUrl || '',
      affiliate_slug: slug,
      today_date: isoDate(),
    },
  });

  // Strip code fences if Claude added them
  let yaml = result.text.trim();
  yaml = yaml.replace(/^```ya?ml\n?/i, '').replace(/\n?```$/, '');

  await writeFile(filePath, yaml.endsWith('\n') ? yaml : yaml + '\n', 'utf-8');
  log.success(`Wrote product YAML: ${filePath}`);
  return filePath;
}
