-- Affiliate click tracking schema (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS click_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  target_url TEXT NOT NULL,
  network TEXT,
  campaign_id TEXT,

  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  referrer TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,

  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  session_id TEXT,
  is_bot INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_click_slug ON click_events(slug);
CREATE INDEX IF NOT EXISTS idx_click_timestamp ON click_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_click_campaign ON click_events(campaign_id);

-- Phase 2: conversions (Accesstrade postback)
CREATE TABLE IF NOT EXISTS conversions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  click_id INTEGER REFERENCES click_events(id),
  campaign_id TEXT,
  payout_vnd INTEGER,
  status TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Optional: quiz_submissions
CREATE TABLE IF NOT EXISTS quiz_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_slug TEXT,
  answers_json TEXT,
  recommendation_slug TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
