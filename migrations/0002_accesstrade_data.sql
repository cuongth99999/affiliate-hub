-- Accesstrade data cache for automation pipeline (Cloudflare D1)

CREATE TABLE IF NOT EXISTS campaigns_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  network TEXT NOT NULL DEFAULT 'accesstrade',
  category TEXT,
  payout_vnd INTEGER,
  payout_percent REAL,
  payout_type TEXT,
  status TEXT,             -- active|paused|ended|unknown
  start_date DATETIME,
  end_date DATETIME,
  cookie_days INTEGER,
  last_synced DATETIME DEFAULT CURRENT_TIMESTAMP,
  raw_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns_cache(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_payout ON campaigns_cache(payout_vnd);

CREATE TABLE IF NOT EXISTS conversion_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,
  conversion_date DATE NOT NULL,
  click_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  payout_pending_vnd INTEGER DEFAULT 0,
  payout_approved_vnd INTEGER DEFAULT 0,
  payout_rejected_vnd INTEGER DEFAULT 0,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(campaign_id, conversion_date)
);

CREATE INDEX IF NOT EXISTS idx_conversion_date ON conversion_stats(conversion_date);
CREATE INDEX IF NOT EXISTS idx_conversion_campaign ON conversion_stats(campaign_id);

-- Raw conversion records (for debugging / future re-aggregation)
CREATE TABLE IF NOT EXISTS conversion_raw (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  accesstrade_id TEXT UNIQUE NOT NULL,
  campaign_id TEXT NOT NULL,
  click_id TEXT,
  order_id TEXT,
  click_time DATETIME,
  conversion_time DATETIME,
  sales_amount INTEGER,
  commission_vnd INTEGER,
  status TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversion_raw_campaign ON conversion_raw(campaign_id);
CREATE INDEX IF NOT EXISTS idx_conversion_raw_status ON conversion_raw(status);
