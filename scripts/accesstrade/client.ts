/**
 * Accesstrade Publisher API client.
 *
 * Reference: https://developers.accesstrade.vn/api-publisher-vietnamese
 * Base URL: https://api.accesstrade.vn
 * Auth header: "Authorization: Token <access_key>"
 * Rate limit: 10 requests / minute → we throttle to 1 req per 6.5s to stay safe
 */
import { env } from '../shared/env';
import { createLogger } from '../shared/logger';
import { slugify } from '../pipeline/utils';
import type {
  AccesstradeCampaign,
  AccesstradeCashbackCampaign,
  AccesstradeDeeplinkRequest,
  AccesstradeDeeplinkResponse,
  AccesstradeTransaction,
  ApiListResponse,
  ApiSingleResponse,
  NormalizedCampaign,
} from './types';

const log = createLogger('accesstrade');

class RateLimiter {
  private last = 0;
  constructor(private minIntervalMs: number) {}
  async wait(): Promise<void> {
    const now = Date.now();
    const wait = Math.max(0, this.minIntervalMs - (now - this.last));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.last = Date.now();
  }
}

// 6.5s gives ~9.2 req/min — safe margin under 10/min limit
const limiter = new RateLimiter(6500);

interface RequestOptions {
  method?: 'GET' | 'POST';
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  await limiter.wait();
  const url = new URL(`${env.ACCESSTRADE_API_BASE}${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const maxAttempts = 3;
  const backoff = [2000, 6000, 15000];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        method: options.method ?? 'GET',
        headers: {
          Authorization: `Token ${env.ACCESSTRADE_API_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'affiliate-hub/0.1 (+https://affiliate-hub.vn)',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (res.status === 429 && attempt < maxAttempts) {
        log.warn(`Rate limited, retry ${attempt}/${maxAttempts}`, { wait: backoff[attempt - 1] });
        await new Promise((r) => setTimeout(r, backoff[attempt - 1]));
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Accesstrade API ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      log.warn(`Request failed, retry ${attempt}/${maxAttempts}`, { error: (err as Error).message });
      await new Promise((r) => setTimeout(r, backoff[attempt - 1]));
    }
  }

  throw new Error('Unreachable');
}

// ─── Pagination helper ─────────────────────────────────────────────────────

async function paginate<T>(
  fetcher: (page: number, limit: number) => Promise<ApiListResponse<T>>,
  limit = 100,
  maxPages = 20,
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetcher(page, limit);
    const batch = res.data ?? [];
    items.push(...batch);
    if (batch.length < limit) break;
  }
  return items;
}

// ─── Public API ────────────────────────────────────────────────────────────

/** List campaigns publisher has registered for (approval=successful by default) */
export async function listCampaigns(
  options: { approval?: 'successful' | 'pending' | 'unregistered' } = {},
): Promise<AccesstradeCampaign[]> {
  log.info('Fetching campaigns', { approval: options.approval ?? 'successful' });
  return paginate<AccesstradeCampaign>((page, limit) =>
    request<ApiListResponse<AccesstradeCampaign>>('/v1/campaigns', {
      query: {
        approval: options.approval ?? 'successful',
        page,
        limit,
      },
    }),
  );
}

/** List cashback campaigns — has commission info (min/max + type) */
export async function listCashbackCampaigns(): Promise<AccesstradeCashbackCampaign[]> {
  log.info('Fetching cashback campaigns (for commission info)');
  return paginate<AccesstradeCashbackCampaign>(async (page, limit) => {
    const res = await request<{
      status?: boolean;
      data: { campaigns: AccesstradeCashbackCampaign[] };
    }>('/v1/cashback/campaigns', {
      query: { page, page_size: limit },
    });
    return {
      data: res.data?.campaigns ?? [],
    };
  });
}

/** List transactions (conversions) in a date range */
export async function listTransactions(opts: {
  sinceIso: string; // e.g. 2026-05-15T00:00:00Z
  untilIso: string;
  merchant?: string;
  status?: 0 | 1 | 2;
}): Promise<AccesstradeTransaction[]> {
  log.info('Fetching transactions', { since: opts.sinceIso, until: opts.untilIso });
  return paginate<AccesstradeTransaction>((page, limit) =>
    request<ApiListResponse<AccesstradeTransaction>>('/v1/transactions', {
      query: {
        since: opts.sinceIso,
        until: opts.untilIso,
        page,
        limit,
        merchant: opts.merchant,
        status: opts.status,
      },
    }),
  );
}

/** Generate affiliate tracking links (deeplinks) for one or more URLs */
export async function createProductLink(
  body: AccesstradeDeeplinkRequest,
): Promise<AccesstradeDeeplinkResponse | null> {
  try {
    const res = await request<ApiSingleResponse<AccesstradeDeeplinkResponse>>(
      '/v1/product_link/create',
      { method: 'POST', body },
    );
    return res.data ?? null;
  } catch (err) {
    log.warn('deeplink generation failed', {
      campaignId: body.campaign_id,
      error: (err as Error).message,
    });
    return null;
  }
}

// ─── Normalization ─────────────────────────────────────────────────────────

/**
 * Convert raw API campaign (+ optional cashback commission data) into our
 * internal NormalizedCampaign shape used by the rest of the pipeline.
 */
export function normalizeCampaign(
  raw: AccesstradeCampaign,
  cashback?: AccesstradeCashbackCampaign,
): NormalizedCampaign {
  const slug = slugify(`${raw.merchant} ${raw.name}`);

  let payoutVnd: number | undefined;
  let payoutPercent: number | undefined;
  let payoutType: NormalizedCampaign['payoutType'] = 'unknown';

  if (cashback) {
    if (cashback.commission_type === 'fixed') {
      payoutVnd = cashback.max_commission;
      // Heuristic: fixed commission for credit-card/loan/account = CPS, but Accesstrade
      // doesn't expose this directly. We default to CPS for fixed payouts and let
      // human reviewers correct in YAML.
      payoutType = 'CPS';
    } else if (cashback.commission_type === 'percentage') {
      payoutPercent = cashback.max_commission;
      payoutType = 'percent';
    }
  }

  // status: 1 = running per docs
  let status: NormalizedCampaign['status'] = 'unknown';
  if (raw.status === 1) status = 'active';
  else if (raw.status === 0) status = 'paused';

  const description = typeof raw.description === 'string' ? raw.description : undefined;

  return {
    id: String(raw.id),
    slug,
    name: raw.name,
    brand: raw.merchant,
    category: cashback?.category_name ?? raw.category ?? 'unknown',
    payoutVnd,
    payoutPercent,
    payoutType,
    targetUrl: raw.url ?? '',
    description,
    logo: raw.logo,
    status,
    startDate: raw.start_time,
    endDate: raw.end_time,
    cookieDays: raw.cookie_duration ? Math.round(raw.cookie_duration / 86400) : undefined,
    raw,
  };
}

/**
 * Fetch campaigns + cashback data together and return normalized list.
 * Joins them by campaign_id. Cashback data adds commission info.
 */
export async function listNormalizedCampaigns(): Promise<NormalizedCampaign[]> {
  const [campaigns, cashbacks] = await Promise.all([
    listCampaigns(),
    listCashbackCampaigns().catch((err) => {
      log.warn('Cashback fetch failed, continuing without commission data', {
        error: (err as Error).message,
      });
      return [] as AccesstradeCashbackCampaign[];
    }),
  ]);

  const cashbackById = new Map<string, AccesstradeCashbackCampaign>();
  for (const c of cashbacks) {
    cashbackById.set(String(c.campaign_id), c);
  }

  return campaigns.map((c) => normalizeCampaign(c, cashbackById.get(String(c.id))));
}
