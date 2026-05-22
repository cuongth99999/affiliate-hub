/**
 * Build-time script: read all src/content/affiliate-links/*.yaml and emit
 * functions/_affiliate-links.json so the Cloudflare Pages Function can
 * resolve slugs at the edge without a KV/D1 round-trip.
 *
 * Run before astro build (see package.json scripts).
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const LINKS_DIR = path.join(REPO_ROOT, 'src/content/affiliate-links');
const OUTPUT_FILE = path.join(REPO_ROOT, 'functions/_affiliate-links.json');

interface AffiliateLinkYaml {
  target_url: string;
  network: string;
  campaign_id?: string;
  payout_vnd?: number;
  payout_percent?: number;
  payout_type?: string;
  product_slug?: string;
  active?: boolean;
  note?: string;
}

interface LinkRecord {
  target_url: string;
  network: string;
  campaign_id?: string;
  active: boolean;
}

async function main() {
  if (!existsSync(LINKS_DIR)) {
    console.error(`Affiliate links directory not found: ${LINKS_DIR}`);
    process.exit(1);
  }

  const files = (await readdir(LINKS_DIR)).filter((f) => f.endsWith('.yaml'));
  const map: Record<string, LinkRecord> = {};

  for (const file of files) {
    const slug = path.basename(file, '.yaml');
    const raw = await readFile(path.join(LINKS_DIR, file), 'utf-8');
    const data = yaml.load(raw) as AffiliateLinkYaml;
    if (!data?.target_url) {
      console.warn(`Skipping ${file}: missing target_url`);
      continue;
    }
    map[slug] = {
      target_url: data.target_url,
      network: data.network ?? 'unknown',
      campaign_id: data.campaign_id,
      active: data.active !== false,
    };
  }

  const outDir = path.dirname(OUTPUT_FILE);
  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
  await writeFile(OUTPUT_FILE, JSON.stringify(map, null, 2) + '\n', 'utf-8');

  console.log(`✓ Wrote ${Object.keys(map).length} affiliate links → ${path.relative(REPO_ROOT, OUTPUT_FILE)}`);
}

main().catch((err) => {
  console.error('build-affiliate-links failed:', err);
  process.exit(1);
});
