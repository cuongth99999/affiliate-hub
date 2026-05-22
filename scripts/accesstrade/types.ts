/**
 * Accesstrade Publisher API types.
 *
 * Reference: https://developers.accesstrade.vn/api-publisher-vietnamese
 * Base URL: https://api.accesstrade.vn
 * Auth: header "Authorization: Token <access_key>" + "Content-Type: application/json"
 * Rate limit: 10 req/min for most endpoints
 */

// ─── /v1/campaigns ─────────────────────────────────────────────────────────

export interface AccesstradeCampaign {
  id: string;
  name: string;
  approval: 'unregistered' | 'pending' | 'successful';
  status: number;              // 1 = running, 0 = paused/stopped
  merchant: string;            // brand name
  cookie_duration: number;     // SECONDS (divide by 86400 for days)
  cookie_policy?: string;
  description?: string | Record<string, unknown>;
  start_time?: string;         // ISO date
  end_time?: string;           // ISO date
  category?: string;
  type?: number;               // campaign type code
  url?: string;                // landing URL
  logo?: string;
}

// ─── /v1/cashback/campaigns ────────────────────────────────────────────────
// New API providing commission info per campaign

export interface AccesstradeCashbackCampaign {
  campaign_id: string;
  name: string;
  status?: string;
  approval?: string;
  min_commission: number;
  max_commission: number;
  commission_type: 'percentage' | 'fixed';
  category_id?: string;
  category_name?: string;
}

// ─── /v1/transactions ──────────────────────────────────────────────────────

export interface AccesstradeTransaction {
  merchant: string;
  status: 0 | 1 | 2;           // 0=hold/pending, 1=approved, 2=rejected
  transaction_id: string;
  transaction_time?: string;   // ISO conversion timestamp
  click_time?: string;
  update_time?: string;
  confirmed_time?: string;
  transaction_value?: number;
  commission?: number;         // VND amount earned
  product_id?: string;
  product_price?: number;
  product_quantity?: number;
  is_confirmed?: 0 | 1;
  is_brand_bonus?: boolean;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  campaign_id?: string;        // not always present; sometimes inferred from merchant
  _extra?: Record<string, unknown>;
}

// ─── /v1/product_link/create ───────────────────────────────────────────────

export interface AccesstradeDeeplinkRequest {
  campaign_id: string;
  urls?: string[];
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  sub1?: string;
  sub2?: string;
  sub3?: string;
  sub4?: string;
}

export interface AccesstradeDeeplinkSuccessItem {
  aff_link: string;
  short_link?: string;
  url_origin: string;
}

export interface AccesstradeDeeplinkResponse {
  success_link: AccesstradeDeeplinkSuccessItem[];
  error_link?: unknown[];
}

// ─── Common API envelope ───────────────────────────────────────────────────

export interface ApiListResponse<T> {
  status?: number | boolean;
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface ApiSingleResponse<T> {
  status?: number | boolean;
  data: T;
  message?: string;
}

// ─── Normalized internal type (after joining campaigns + cashback data) ────

export interface NormalizedCampaign {
  id: string;
  slug: string;                // derived URL-safe slug
  name: string;
  brand: string;
  category: string;
  payoutVnd?: number;          // resolved from max_commission when commission_type='fixed'
  payoutPercent?: number;      // resolved from max_commission when commission_type='percentage'
  payoutType: 'CPS' | 'CPQL' | 'CPL' | 'percent' | 'hybrid' | 'unknown';
  targetUrl: string;
  description?: string;
  logo?: string;
  status: 'active' | 'paused' | 'ended' | 'unknown';
  startDate?: string;
  endDate?: string;
  cookieDays?: number;
  raw: AccesstradeCampaign;
}
