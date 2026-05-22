# Accesstrade Automation Pipeline

> **Last updated**: 2026-05-22
> **Status**: Plan approved — ready to scaffold
> **Companion docs**: PROJECT_PLAN.md, TECH_ARCHITECTURE.md

---

## 0. Goal

Tự động hoá pipeline từ Accesstrade campaign → bài viết publish, nhưng **giữ human-in-the-loop để tránh Google penalty**.

## 1. Workflow chốt

**Smart Auto (Drafts → Review → Publish)**:

```
[GitHub Actions cron — Monday 9AM Vietnam (02:00 UTC)]
    ↓
1. sync-campaigns    Pull Accesstrade /campaigns → update affiliate-links/*.yaml
2. find-hot          Filter: payout > threshold + chưa có post + còn active
3. draft-post (×N)   Claude API generate draft MDX (draft: true) cho top 3-5 campaigns
4. open-pr           Tạo branch "auto-draft/{date}", commit drafts, mở 1 PR aggregate
5. notify-telegram   Push notification với link PR + checklist
    ↓
[Mỗi tuần — 30-60 phút Monday afternoon]
    Human review PR:
    • Đọc draft, đối chiếu campaign info
    • Sửa nội dung honest (không PR trá hình)
    • Thêm ảnh thật, screenshot
    • Set draft: false
    • Merge PR → Cloudflare auto deploy
    ↓
[GitHub Actions cron — Sunday 23:00 VN, weekly stats]
    sync-conversions   Pull conversion stats → upsert vào D1
    weekly-report      Tổng hợp → Telegram notify (revenue, top posts, broken links)
```

## 2. Components to build

### 2.1 Folder structure

```
scripts/
├── accesstrade/
│   ├── client.ts                  ← API wrapper với retry + rate limit
│   ├── types.ts                   ← TypeScript types từ API response
│   ├── sync-campaigns.ts          ← Pull campaigns → yaml
│   ├── sync-conversions.ts        ← Pull conversions → D1
│   └── find-hot.ts                ← Detect hot campaigns
│
├── content/
│   ├── draft-post.ts              ← Orchestrate single post draft
│   ├── draft-product-yaml.ts      ← Auto-create product YAML
│   ├── claude-client.ts           ← Anthropic SDK wrapper với prompt caching
│   ├── post-validator.ts          ← Lint MDX trước khi commit
│   └── prompt-templates/
│       ├── review.md
│       ├── comparison.md
│       └── product-yaml.md
│
├── notify/
│   ├── telegram.ts                ← Bot API client
│   └── format-message.ts          ← Markdown formatter cho Telegram
│
├── pipeline/
│   ├── weekly-draft.ts            ← Main orchestrator (cron job)
│   ├── weekly-stats.ts            ← Conversion stats orchestrator
│   └── utils.ts                   ← Git helpers, slug helpers
│
└── shared/
    ├── env.ts                     ← Load + validate env vars (Zod)
    └── logger.ts

.github/workflows/
├── deploy.yml                     ← (existing) Cloudflare deploy on push to main
├── accesstrade-weekly-draft.yml   ← Cron Monday 9AM VN → pipeline/weekly-draft
└── accesstrade-weekly-stats.yml   ← Cron Sunday 23:00 VN → pipeline/weekly-stats

migrations/
└── 0002_accesstrade_data.sql      ← campaigns_cache + conversion_stats tables

data/
└── seen-campaigns.json            ← Track campaigns đã có bài, tránh duplicate
                                      (committed to repo, source of truth)
```

### 2.2 Số file mới: ~17-20

## 3. Accesstrade API contract (verified 2026-05-22 from docs)

### Auth
```
Authorization: Token <ACCESSTRADE_API_TOKEN>
Content-Type: application/json
```
Token lấy từ: `pub.accesstrade.vn/accounts/profile`

### Endpoints used (correct paths from developers.accesstrade.vn)

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/campaigns?approval=successful` | Campaigns publisher đã join (paginated, has cookie_duration in **seconds**) |
| GET | `/v1/cashback/campaigns?page_size=100` | Commission info (min/max + commission_type: fixed/percentage) |
| GET | `/v1/transactions?since=ISO&until=ISO` | Conversion records (renamed from "conversions") |
| POST | `/v1/product_link/create` | Generate affiliate tracking link (body: campaign_id, urls[], utm_*) |

### Field shape (key differences from initial assumption)

- `Campaign.status` is **number**: `1 = running`, `0 = paused/stopped` (not string)
- `Campaign.cookie_duration` is in **seconds** (divide by 86400 for days)
- `Campaign.merchant` is the brand name (not separate `brand` field)
- Commission info lives in `/cashback/campaigns` not `/campaigns`. Join by `campaign_id`.
- `Transaction.commission` (not `commission_amount`)
- `Transaction.status` is number: `0=pending/hold, 1=approved, 2=rejected`
- `Transaction.transaction_time` (not `conversion_time`)
- Deeplink is POST with body, returns `data.success_link[].aff_link` (not `long_url`)

### Rate limit
**10 requests/minute** for most endpoints (docs confirmed).

Client implementation:
- Throttle: **1 request per 6.5 seconds** (~9.2 req/min, safe margin)
- Retry 3 lần với exponential backoff (2s, 6s, 15s)
- Cache campaign list trong run (không gọi lại trong cùng pipeline)
- Pagination: max 20 pages, 100 items/page

## 4. D1 schema bổ sung

```sql
-- migrations/0002_accesstrade_data.sql

CREATE TABLE IF NOT EXISTS campaigns_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  network TEXT NOT NULL,
  payout_vnd INTEGER,
  payout_type TEXT,
  category TEXT,
  status TEXT,             -- active|paused|ended
  start_date DATETIME,
  end_date DATETIME,
  last_synced DATETIME DEFAULT CURRENT_TIMESTAMP,
  raw_json TEXT            -- full API response cho audit
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
```

## 5. Hot campaign detection rules

```typescript
// scripts/accesstrade/find-hot.ts

const HOT_RULES = {
  // Minimum payout to consider
  minPayoutVnd: 100_000,        // 100k VND/CPS
  
  // Allowed payout types
  payoutTypes: ['CPS', 'CPQL', 'percent', 'hybrid'],
  
  // Excluded industries (YMYL risk + brand fit)
  excludeCategories: ['gambling', 'forex', 'binary_options', 'adult', 'mlm'],
  
  // Campaign must be active and started within window
  newSinceDays: 60,             // Mới active trong 60 ngày
  excludeEndingDays: 14,        // Loại nếu sắp kết thúc < 14 ngày
  
  // Skip if we already have a post for this campaign
  skipIfPostExists: true,
  
  // Limit per weekly run to avoid mass-publish flag
  maxPerRun: 3,
  
  // Cluster mapping (campaign category → our cluster)
  categoryMap: {
    'credit-card': 'the-tin-dung',
    'banking': 'tai-khoan-ngan-hang',
    'loan': 'vay-tieu-dung',
    'broker': 'chung-khoan',
    'crypto-exchange': 'crypto',
    // unknown → null (skip)
  },
};
```

Output: array `HotCandidate[]` sorted by `score = payoutVnd × recencyBonus × categoryFit`.

## 6. Claude prompt template (review.md)

```markdown
Bạn là chuyên gia tài chính cá nhân Việt Nam, viết blog cho người 25-35 tuổi.

Viết bài "Review {{product_name}}" với cấu trúc:
1. TL;DR 3 dòng — phù hợp với ai, ưu/nhược lớn nhất
2. Thông số cơ bản (bảng): {{specs}}
3. 3 ưu điểm với ví dụ số liệu cụ thể
4. 3 nhược điểm honest (KHÔNG PR)
5. So sánh với 1-2 đối thủ phân khúc
6. Điều kiện mở + tỷ lệ duyệt thực tế
7. Hướng dẫn step-by-step
8. FAQ 5 câu (schema markup)

Context campaign từ Accesstrade:
- Brand: {{brand}}
- Payout: {{payout_vnd}} VND ({{payout_type}})
- Conditions: {{conditions}}
- Banner: {{banner_url}}

QUAN TRỌNG:
- Văn phong tự nhiên, KHÔNG dùng từ AI điển hình ("Trong bối cảnh", "Đáng chú ý là", "Hơn nữa")
- Câu ngắn 5-15 từ
- Chèn `<AffiliateButton slug="{{slug}}">CTA text</AffiliateButton>` ở 2 vị trí: cuối ưu điểm + cuối hướng dẫn
- Chèn `[SCREENSHOT_NEEDED]` nơi cần ảnh thật (human sẽ thay sau)
- Output Markdown thuần với frontmatter Astro
- Set `draft: true` trong frontmatter
- Set `keywords:` array 5-8 long-tail VN keywords

Output bắt đầu bằng `---` (frontmatter), không có text giải thích trước/sau.
```

## 7. Telegram notify format

```
🤖 *Auto-draft tuần này* — 22/05/2026

📝 *3 drafts mới cần review:*

1. [Review VPBank Lady StepUp](github.com/.../pull/123)
   💰 420k VND/CPS | the-tin-dung/review

2. [Review TPBank EVO 2026](github.com/.../pull/123)
   💰 350k VND/CPS | the-tin-dung/review

3. [Review Cake by VPBank](github.com/.../pull/123)
   💰 80k VND/CPL | tai-khoan-ngan-hang/review

✅ *Checklist mỗi bài:*
- [ ] Đọc lần lượt, sửa chỗ AI bịa
- [ ] Thay [SCREENSHOT_NEEDED] bằng ảnh thật
- [ ] Set draft: false
- [ ] Merge

🔗 PR: github.com/.../pull/123
```

## 8. Env variables cần

```bash
# .env (local)
ACCESSTRADE_API_TOKEN=
ACCESSTRADE_PUBLISHER_ID=
ANTHROPIC_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Cloudflare D1 (production)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_D1_DATABASE_ID=
CLOUDFLARE_API_TOKEN=

# GitHub Actions Secrets (mirror of above)
```

## 9. Safety guards

1. **maxPerRun: 3** — không bao giờ tạo > 3 draft/tuần. Tránh Google flag mass-publish.
2. **draft: true mặc định** — không bao giờ auto-merge. Bắt buộc human review.
3. **PR aggregate** — gom tất cả drafts vào 1 PR/tuần, dễ review một lần.
4. **Excluded categories** — skip gambling/forex/MLM ngay từ bước find-hot.
5. **Existing post check** — không generate trùng campaign đã có bài.
6. **Rate limit Anthropic API** — max 5 Claude calls/run (3 review + 2 buffer).
7. **Audit log** — mọi draft generated lưu vào `data/auto-draft-history.json` (committed).
8. **Kill switch** — env `AUTO_DRAFT_ENABLED=false` → workflow skip toàn bộ.

## 10. Scripts to add to package.json

```json
{
  "scripts": {
    "at:sync": "tsx scripts/accesstrade/sync-campaigns.ts",
    "at:hot": "tsx scripts/accesstrade/find-hot.ts",
    "at:stats": "tsx scripts/accesstrade/sync-conversions.ts",
    "draft:one": "tsx scripts/content/draft-post.ts",
    "draft:weekly": "tsx scripts/pipeline/weekly-draft.ts",
    "stats:weekly": "tsx scripts/pipeline/weekly-stats.ts",
    "notify:test": "tsx scripts/notify/telegram.ts test"
  }
}
```

## 11. Implementation stages

| Stage | Subject | Files |
|---|---|---|
| **A1** | Shared utilities | `shared/env.ts`, `shared/logger.ts`, `pipeline/utils.ts` |
| **A2** | Accesstrade client | `accesstrade/client.ts`, `accesstrade/types.ts` |
| **A3** | Sync campaigns | `accesstrade/sync-campaigns.ts` + tests |
| **A4** | Find hot campaigns | `accesstrade/find-hot.ts` |
| **A5** | Sync conversions | `accesstrade/sync-conversions.ts` + D1 migration |
| **A6** | Claude client + prompts | `content/claude-client.ts`, `content/prompt-templates/*` |
| **A7** | Draft post | `content/draft-post.ts`, `content/draft-product-yaml.ts`, `content/post-validator.ts` |
| **A8** | Telegram notify | `notify/telegram.ts`, `notify/format-message.ts` |
| **A9** | Weekly orchestrators | `pipeline/weekly-draft.ts`, `pipeline/weekly-stats.ts` |
| **A10** | GitHub Actions | 2 workflow YAMLs |
| **A11** | Docs + smoke test | Update README, env.example, test e2e local |

Estimate: **~18 files, ~1500-2000 lines code**

## 12. Pre-build checklist (bạn cần làm trước)

1. **Lấy Accesstrade API token**: Dashboard → Publisher API → tạo token. Note publisher ID.
2. **Đăng ký các campaign cần thiết** trên Accesstrade UI (VPBank, TPBank, Cake, etc.).
3. **Tạo Telegram bot**:
   - Chat @BotFather → `/newbot` → đặt tên → nhận token
   - Chat /start với bot → mở https://api.telegram.org/bot{token}/getUpdates → lấy chat_id
4. **Anthropic API key**: console.anthropic.com → API keys → tạo key (note: ~$0.5-2/draft với Opus, rẻ hơn nếu dùng Sonnet)

## 13. Approval to start

Pipeline plan đã đủ chi tiết. Khi bạn confirm, tôi scaffold theo Stage A1 → A11.

**Câu hỏi cuối**:
- Có muốn skip stage nào không (vd: skip A5 conversion stats lúc đầu)?
- Có muốn dùng Claude Sonnet (rẻ hơn 5x) thay Opus cho drafts?
- Có sẵn sàng tạo credentials (Accesstrade, Telegram, Anthropic) chưa, hay tôi scaffold với placeholder để bạn fill sau?
