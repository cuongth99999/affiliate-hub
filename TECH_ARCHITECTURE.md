# Technical Architecture — Affiliate Hub

> **Last updated**: 2026-05-22
> **Status**: Plan — awaiting approval before scaffold
> **Companion doc**: PROJECT_PLAN.md (business plan)

---

## 0. Design Principles

1. **SEO-first** — site sống chết bởi Google ranking → SSG (static), schema-rich, fast
2. **Edge-first** — chạy trên Cloudflare edge → free tier, fast globally, scale infinite
3. **File-as-DB cho content** — MDX trong Git, không cần CMS server → đơn giản, version controlled
4. **Real DB chỉ cho click tracking** — affiliate click logs, không cho content
5. **No vendor lock-in cho content** — MDX standard, dễ export/migrate
6. **Performance budget**: < 100KB JS shipped/page, > 95 Lighthouse, < 1s LCP

---

## 1. Tech Stack

### Frontend
| Layer | Choice | Version | Lý do |
|---|---|---|---|
| Framework | **Astro** | 4.x | SSG-first, partial hydration, MDX native, smaller JS bundle vs Next.js |
| Styling | **Tailwind CSS** | 3.x | Utility-first, fast iterate, auto-purge unused, no CSS file mess |
| Interactive islands | **React** | 18.x | Lớn nhất ecosystem, Claude generate dễ, dùng cho quiz/calculator |
| Language | **TypeScript** | 5.x strict | Catch bugs sớm, schema validation với Zod |
| Content | **MDX** | latest | Markdown + React components → callout, table, embed |
| Icons | **Lucide React** | latest | Tree-shakeable, clean |

### Backend
| Layer | Choice | Lý do |
|---|---|---|
| API endpoints | **Astro file-based endpoints** | Cùng codebase, deploy edge |
| Edge runtime | **Cloudflare Pages Functions** | Free, fast, gắn liền hosting |
| Server framework | **Không cần Node server** | Mọi thứ static hoặc edge function |

### Database
| Purpose | Choice | Why |
|---|---|---|
| **Content** | **File-based MDX** trong `src/content/` | Git là source of truth, no DB |
| **Affiliate click tracking** | **Cloudflare D1** (SQLite at edge) | Free 5M reads/day, edge-local |
| **Analytics** | **Plausible** ($9/mo) hoặc **Umami** self-host (free) | Privacy-friendly, GDPR-ok |
| **Email list** | **Beehiiv** (free ≤2500 subs) | Free tier rộng rãi, built-in newsletter UI |
| **Search** | **Pagefind** (build-time static index) | Không cần server, JS index < 100KB |

### Dev/Build
| Tool | Choice |
|---|---|
| Package manager | **pnpm** (recommend) hoặc npm |
| Linter | **ESLint** + Astro plugin |
| Formatter | **Prettier** + Astro plugin |
| Type check | **astro check** |
| Pre-commit | **Husky** + **lint-staged** (optional) |

### Deployment
| Service | Purpose | Cost |
|---|---|---|
| **Cloudflare Pages** | Static hosting + edge functions | Free |
| **Cloudflare D1** | Click tracking DB | Free tier rộng |
| **Cloudflare DNS** | DNS management | Free |
| **GitHub** | Source code + CI trigger | Free |

**Tổng chi phí MVP**: $0/tháng (chỉ domain ~$10/năm)

---

## 2. Architecture Diagram (text)

```
                       ┌──────────────────────┐
                       │   User Browser       │
                       └──────────┬───────────┘
                                  │
                                  ↓
                       ┌──────────────────────┐
                       │  Cloudflare CDN      │  (300+ edge locations)
                       │  - Serve static HTML │
                       │  - Cache aggressively│
                       └──────────┬───────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ↓                         ↓                         ↓
┌───────────────┐       ┌──────────────────┐      ┌───────────────────┐
│ Static Pages  │       │  Edge Function   │      │  React Island     │
│ (.html files) │       │  /go/[slug]      │      │  (Quiz/Calc/Form) │
│ Built by      │       │  - Lookup target │      │  Hydrate on demand│
│ Astro SSG     │       │  - Log click → D1│      └─────────┬─────────┘
└───────────────┘       │  - 302 redirect  │                │
                        └────────┬─────────┘                │
                                 │                          │
                                 ↓                          ↓
                        ┌──────────────────┐      ┌───────────────────┐
                        │   Cloudflare D1  │      │  External APIs    │
                        │  click_events    │      │  - Beehiiv (email)│
                        │  table           │      │  - Plausible(stats)│
                        └──────────────────┘      └───────────────────┘

Content Pipeline (offline):
┌──────────┐   ┌──────────┐   ┌───────────┐   ┌──────────┐   ┌──────────┐
│ Idea     │ → │ Claude   │ → │ Human     │ → │ MDX file │ → │ Git push │
│ research │   │ API draft│   │ edit+data │   │ in repo  │   │ → deploy │
└──────────┘   └──────────┘   └───────────┘   └──────────┘   └──────────┘
```

---

## 3. Project Folder Structure

```
affiliate-hub/
├── .env.example                          ← biến môi trường mẫu
├── .gitignore
├── .nvmrc                                ← Node version (20.x)
├── .prettierrc
├── .eslintrc.cjs
├── README.md
├── PROJECT_PLAN.md                       ← business plan
├── TECH_ARCHITECTURE.md                  ← (this file)
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── package.json
├── pnpm-lock.yaml
├── wrangler.toml                         ← Cloudflare Pages/Functions config
│
├── public/                               ← static assets, served as-is
│   ├── robots.txt
│   ├── favicon.svg
│   ├── og-default.jpg
│   ├── img/
│   │   ├── brands/                       ← logo ngân hàng/app
│   │   └── posts/                        ← ảnh trong bài
│   └── _redirects                        ← Cloudflare redirects (nếu cần)
│
├── src/
│   ├── content/                          ← Content Collections (MDX + YAML)
│   │   ├── config.ts                     ← Zod schemas validate frontmatter
│   │   ├── posts/                        ← bài viết (organized by cluster)
│   │   │   ├── the-tin-dung/
│   │   │   │   ├── _pillar.mdx           ← pillar page nội dung
│   │   │   │   ├── danh-sach-tot-nhat.mdx
│   │   │   │   ├── review-vpbank-lady.mdx
│   │   │   │   ├── so-sanh-vpbank-vs-tpbank.mdx
│   │   │   │   └── huong-dan-cach-mo-online.mdx
│   │   │   ├── tai-khoan-ngan-hang/
│   │   │   ├── vay-tieu-dung/
│   │   │   ├── chung-khoan/
│   │   │   └── crypto/
│   │   ├── authors/
│   │   │   └── nguyen-van-a.mdx
│   │   ├── products/                     ← data sản phẩm (reusable)
│   │   │   ├── vpbank-lady.yaml
│   │   │   ├── tpbank-evo.yaml
│   │   │   ├── cake-bank.yaml
│   │   │   └── ...
│   │   └── affiliate-links/              ← link tracking config
│   │       └── links.yaml                ← slug → target URL + meta
│   │
│   ├── layouts/                          ← page templates
│   │   ├── BaseLayout.astro              ← html/head/meta/schema chung
│   │   ├── PostLayout.astro              ← layout bài viết default
│   │   ├── ReviewLayout.astro            ← + rating + pros/cons + product card
│   │   ├── ComparisonLayout.astro        ← side-by-side table
│   │   ├── GuideLayout.astro             ← step-by-step, HowTo schema
│   │   ├── FAQLayout.astro               ← FAQPage schema
│   │   └── PillarLayout.astro            ← cluster intro, link to children
│   │
│   ├── components/
│   │   ├── ui/                           ← primitives (Tailwind based)
│   │   │   ├── Button.astro
│   │   │   ├── Card.astro
│   │   │   ├── Badge.astro
│   │   │   └── Container.astro
│   │   ├── affiliate/
│   │   │   ├── AffiliateLink.astro       ← <a href="/go/[slug]">
│   │   │   ├── AffiliateButton.astro     ← CTA button big
│   │   │   ├── AffiliateDisclosure.astro ← compliance text
│   │   │   └── ProductCard.astro         ← card hiển thị thẻ/app
│   │   ├── content/
│   │   │   ├── TableOfContents.astro     ← auto từ h2/h3
│   │   │   ├── ProsConsBox.astro
│   │   │   ├── ComparisonTable.astro
│   │   │   ├── RatingStars.astro
│   │   │   ├── Callout.astro             ← MDX: <Callout type="warning">
│   │   │   ├── RelatedPosts.astro
│   │   │   └── AuthorBox.astro           ← E-E-A-T
│   │   ├── seo/                          ← schema/meta components
│   │   │   ├── BaseSeo.astro             ← og, twitter, canonical
│   │   │   ├── ArticleSchema.astro
│   │   │   ├── ReviewSchema.astro
│   │   │   ├── FAQSchema.astro
│   │   │   ├── HowToSchema.astro
│   │   │   ├── BreadcrumbSchema.astro
│   │   │   ├── OrganizationSchema.astro
│   │   │   └── ProductSchema.astro
│   │   ├── navigation/
│   │   │   ├── Header.astro              ← top nav + mega menu
│   │   │   ├── Footer.astro
│   │   │   ├── Breadcrumbs.astro
│   │   │   └── ClusterNav.astro          ← sidebar cluster
│   │   ├── tools/                        ← React islands (interactive)
│   │   │   ├── CreditCardQuiz.tsx        ← quiz "thẻ nào phù hợp"
│   │   │   ├── LoanCalculator.tsx
│   │   │   ├── SavingsCalculator.tsx
│   │   │   └── DcaCalculator.tsx
│   │   └── newsletter/
│   │       └── SignupForm.tsx            ← React form → Beehiiv API
│   │
│   ├── pages/                            ← file-based routing
│   │   ├── index.astro                   ← /
│   │   ├── 404.astro
│   │   ├── ve-chung-toi.astro
│   │   ├── tuyen-bo-affiliate.astro
│   │   ├── chinh-sach-bao-mat.astro
│   │   ├── lien-he.astro
│   │   ├── rss.xml.ts                    ← RSS feed generator
│   │   ├── tac-gia/
│   │   │   └── [author].astro            ← author pages
│   │   ├── [cluster]/
│   │   │   ├── index.astro               ← pillar page (cluster intro)
│   │   │   └── [...slug].astro           ← nested: /the-tin-dung/review/vpbank-lady/
│   │   ├── cong-cu/
│   │   │   ├── index.astro
│   │   │   ├── the-tin-dung-nao-phu-hop.astro
│   │   │   ├── tinh-lai-vay.astro
│   │   │   ├── tinh-lai-tiet-kiem.astro
│   │   │   └── dca-crypto.astro
│   │   ├── go/
│   │   │   └── [slug].ts                 ← affiliate redirect endpoint
│   │   └── api/
│   │       ├── newsletter.ts             ← POST /api/newsletter
│   │       └── quiz-submit.ts            ← POST /api/quiz-submit
│   │
│   ├── lib/                              ← utility/helper functions
│   │   ├── seo.ts                        ← buildMeta(), buildOg()
│   │   ├── schema.ts                     ← buildJsonLd(), helpers
│   │   ├── content.ts                    ← getPostsByCluster(), getRelated()
│   │   ├── affiliate.ts                  ← getAffiliateUrl(), trackClick()
│   │   ├── analytics.ts                  ← Plausible event helpers
│   │   ├── slugify.ts                    ← Vietnamese → ASCII slug
│   │   └── utils.ts
│   │
│   ├── styles/
│   │   └── global.css                    ← Tailwind base + custom CSS minimal
│   │
│   └── env.d.ts                          ← TypeScript ambient types
│
├── functions/                            ← Cloudflare Pages Functions (edge)
│   ├── go/
│   │   └── [[slug]].ts                   ← /go/* handler (redirect + D1 log)
│   └── _middleware.ts                    ← CORS, security headers
│
├── scripts/                              ← dev/maintenance scripts (Node CLI)
│   ├── claude-draft.ts                   ← AI content drafting helper
│   ├── content-stats.ts                  ← count posts, traffic est
│   ├── seed-affiliate-links.ts           ← bulk import từ Accesstrade
│   └── check-broken-links.ts
│
├── migrations/                           ← D1 schema migrations
│   └── 0001_init_click_events.sql
│
└── tests/                                ← Vitest unit tests (optional MVP)
    ├── lib/slugify.test.ts
    └── content/schema.test.ts
```

---

## 4. Modules Breakdown

### Module 1 — Content Module
**Purpose**: Quản lý bài viết, products, authors qua file MDX/YAML

**Components**:
- Content Collections (`src/content/config.ts`) — Zod schema cho mỗi loại
- Content helpers (`src/lib/content.ts`)
- MDX components shortcode (Callout, ComparisonTable, ProsConsBox)

**Build-time validation**: Mọi frontmatter sai schema → build fail (an toàn)

### Module 2 — Routing & Templates Module
**Purpose**: Map URL → template phù hợp

**Logic**:
- `/[cluster]/` → PillarLayout (lấy `_pillar.mdx` của cluster)
- `/[cluster]/review/[slug]/` → ReviewLayout (parse type từ frontmatter)
- `/[cluster]/so-sanh/[slug]/` → ComparisonLayout
- `/[cluster]/huong-dan/[slug]/` → GuideLayout
- `/[cluster]/cau-hoi/[slug]/` → FAQLayout

**Implementation**: 1 file `[cluster]/[...slug].astro` dùng `getStaticPaths` + dynamic layout selection

### Module 3 — SEO Module
**Purpose**: Mọi page có meta + schema chuẩn

**Components**:
- `<BaseSeo>` — meta tags + OG + Twitter + canonical
- 7 schema components (Article, Review, FAQ, HowTo, Breadcrumb, Organization, Product)
- Auto sitemap.xml (Astro plugin `@astrojs/sitemap`)
- Auto RSS feed (`pages/rss.xml.ts`)
- robots.txt

**Per-page schema**:
| Layout | Schemas included |
|---|---|
| Homepage | Organization + WebSite + SearchAction |
| Pillar | Article + Breadcrumb |
| Review | Review + Product + AggregateRating + Breadcrumb |
| Comparison | Article + ItemList + Breadcrumb |
| Guide | HowTo + Breadcrumb |
| FAQ | FAQPage + Breadcrumb |

### Module 4 — Affiliate Tracking Module
**Purpose**: Mọi affiliate link đi qua `/go/[slug]` để track + dễ thay đổi

**Flow**:
1. Author viết `<AffiliateLink slug="vpbank-lady">Mở thẻ ngay</AffiliateLink>`
2. Render thành `<a href="/go/vpbank-lady" rel="nofollow sponsored">Mở thẻ ngay</a>`
3. User click → `/go/vpbank-lady` hit Cloudflare Function
4. Function:
   - Lookup `vpbank-lady` trong D1 hoặc config
   - Log click event: timestamp, slug, referrer, UA, country (CF auto detect), UTM
   - 302 redirect đến target Accesstrade URL
5. Dashboard nội bộ `/admin/clicks` (Phase 2) đọc D1 để xem stats

**Lợi ích**:
- Đổi target URL chỉ cần edit config, không phải sửa 50 bài
- Track click first-party (Accesstrade dashboard có thể chậm/sai)
- Cloak referrer cho Accesstrade
- A/B test landing page dễ

**Config schema** (`links.yaml`):
```yaml
- slug: vpbank-lady
  target: https://accesstrade.vn/aff/12345?camp=vpbank_lady_2026
  network: accesstrade
  campaign_id: vpbank_lady_2026
  payout_vnd: 420000
  payout_type: CPS
  product_slug: vpbank-lady
  active: true
```

### Module 5 — Schema/JSON-LD Module
**Purpose**: Generate JSON-LD đúng chuẩn schema.org

**Approach**: Component-based, drop vào layout
```astro
<ReviewSchema 
  product={product}
  rating={4.2}
  author={author}
  reviewBody={description}
/>
```
Component tự render `<script type="application/ld+json">...</script>` đúng spec.

### Module 6 — Tools Module (Interactive)
**Purpose**: Quiz, calculator → magnet backlink + conversion intent cao

**Components**:
- **CreditCardQuiz**: 5-7 câu hỏi (lương, mục đích, độ tuổi) → recommend top 3 thẻ
- **LoanCalculator**: nhập khoản vay → trả tháng, tổng lãi
- **SavingsCalculator**: compound interest
- **DcaCalculator**: DCA crypto/chứng khoán

**Implementation**: React island, `client:visible` (load khi scroll tới)

**Result flow**:
- Quiz xong → hiển thị recommendation + affiliate button
- Optional: POST result lên D1 để track popular flows

### Module 7 — Navigation Module
**Components**:
- **Header**: logo + mega menu cluster + search + CTA newsletter
- **Footer**: site map + disclaimer + social + email signup
- **Breadcrumbs**: auto từ URL path, có schema
- **ClusterNav**: sidebar trong cluster page show related posts
- **RelatedPosts**: auto same-cluster + manual via frontmatter

### Module 8 — Newsletter Module
**Components**:
- `SignupForm.tsx` — React island, POST to `/api/newsletter`
- `/api/newsletter.ts` — forward to Beehiiv API
- MDX shortcode `<Newsletter />` để embed trong bài

### Module 9 — Analytics Module
**Setup**:
- Plausible script in `<head>` (1 dòng, ~1KB)
- Custom events qua `plausible('Affiliate Click', { props: { slug } })`
- D1 click table cho first-party data
- Cron job (weekly) generate report

### Module 10 — Build/Deploy Module
**Pipeline**:
```
Git push main →
  Cloudflare Pages auto build →
    pnpm install → astro check → astro build →
    Deploy /dist/* to CDN + /functions to edge
```

**Preview deploys**: Mỗi PR có preview URL riêng

---

## 5. Data Models (Content Schemas)

```typescript
// src/content/config.ts

const postSchema = z.object({
  title: z.string().max(70),
  slug: z.string(),
  description: z.string().max(170),
  date: z.date(),
  modified: z.date(),
  author: z.string(),  // ref → authors collection
  cluster: z.enum([
    'the-tin-dung', 'vay-tieu-dung', 'tai-khoan-ngan-hang',
    'chung-khoan', 'crypto', 'tiet-kiem', 'bao-hiem'
  ]),
  type: z.enum([
    'pillar', 'listicle', 'review', 'comparison',
    'guide', 'faq', 'kien-thuc'
  ]),
  product: z.string().optional(),       // ref → products
  rating: z.number().min(0).max(5).optional(),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
  affiliate_links: z.array(z.string()).optional(),  // refs
  related: z.array(z.string()).optional(),
  keywords: z.array(z.string()),
  featured_image: z.string().optional(),
  og_image: z.string().optional(),
  draft: z.boolean().default(false),
});

const productSchema = z.object({
  slug: z.string(),
  name: z.string(),
  brand: z.string(),
  category: z.string(),
  type: z.enum(['credit-card', 'bank-account', 'loan', 'broker', 'exchange', 'insurance']),
  specs: z.record(z.union([z.string(), z.number()])),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  conditions: z.record(z.string()).optional(),
  affiliate_slug: z.string().optional(),
  logo: z.string().optional(),
});

const authorSchema = z.object({
  slug: z.string(),
  name: z.string(),
  bio: z.string(),
  avatar: z.string(),
  linkedin: z.string().url().optional(),
  expertise: z.array(z.string()),
  joined_date: z.date(),
});

const affiliateLinkSchema = z.object({
  slug: z.string(),
  target_url: z.string().url(),
  network: z.enum(['accesstrade', 'masoffer', 'direct', 'binance', 'tiktok-shop']),
  campaign_id: z.string().optional(),
  payout_vnd: z.number().optional(),
  payout_type: z.enum(['CPL', 'CPQL', 'CPS', 'percent']).optional(),
  product_slug: z.string().optional(),
  active: z.boolean().default(true),
});
```

---

## 6. Database Schema (Cloudflare D1)

```sql
-- migrations/0001_init_click_events.sql

CREATE TABLE click_events (
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
  
  session_id TEXT,    -- anonymous, hashed IP+UA daily
  is_bot INTEGER DEFAULT 0
);

CREATE INDEX idx_click_slug ON click_events(slug);
CREATE INDEX idx_click_timestamp ON click_events(timestamp);
CREATE INDEX idx_click_campaign ON click_events(campaign_id);

-- Phase 2: conversions table (when Accesstrade postback supported)
CREATE TABLE conversions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  click_id INTEGER REFERENCES click_events(id),
  campaign_id TEXT,
  payout_vnd INTEGER,
  status TEXT,  -- pending|approved|rejected
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Optional: quiz_submissions
CREATE TABLE quiz_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_slug TEXT,
  answers_json TEXT,
  recommendation_slug TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7. External Integrations

| Service | Purpose | API/Setup | Cost |
|---|---|---|---|
| **Accesstrade** | Source of truth affiliate links | Manual export → YAML | Free |
| **Cloudflare Pages** | Hosting + edge | Connect GitHub repo | Free |
| **Cloudflare D1** | Click tracking | `wrangler.toml` binding | Free tier |
| **Cloudflare Workers** | Edge compute | Pages Functions | Free tier |
| **Plausible** | Analytics | `<script>` snippet | $9/mo (sau MVP) |
| **Beehiiv** | Newsletter | REST API | Free ≤2500 subs |
| **Google Search Console** | SEO monitoring | Verify domain | Free |
| **Claude API** | Content drafting | `scripts/claude-draft.ts` | Pay per use |
| **Vbee.vn** | TTS (video pipeline) | Separate repo | ~50k/tháng |
| **Pexels** | B-roll footage | REST API | Free |

---

## 8. Development Workflow

### Local dev
```bash
pnpm install
pnpm dev              # http://localhost:4321
pnpm build            # → /dist
pnpm preview          # test prod build local
pnpm astro check      # type check
```

### Content workflow
```bash
# 1. Tạo draft với Claude
pnpm tsx scripts/claude-draft.ts --type review --product vpbank-lady

# 2. Edit MDX file vừa generate
# 3. Add ảnh thật vào public/img/
# 4. Test local
pnpm dev

# 5. Commit + push
git add src/content/posts/the-tin-dung/review-vpbank-lady.mdx
git commit -m "post: review VPBank Lady"
git push  # → auto deploy
```

### Affiliate link workflow
```bash
# 1. Lấy link mới từ Accesstrade dashboard
# 2. Thêm vào src/content/affiliate-links/links.yaml
# 3. Commit → auto deploy → /go/[new-slug] hoạt động ngay
```

### D1 setup (one-time)
```bash
wrangler d1 create affiliate-hub-clicks
wrangler d1 execute affiliate-hub-clicks --file=migrations/0001_init_click_events.sql
```

---

## 9. Performance & SEO Targets

| Metric | Target |
|---|---|
| Lighthouse Performance | ≥ 95 |
| Lighthouse SEO | 100 |
| Lighthouse Accessibility | ≥ 95 |
| LCP (Largest Contentful Paint) | < 1.2s |
| FID/INP | < 100ms |
| CLS | < 0.1 |
| JS shipped/page | < 100KB |
| HTML size/page | < 50KB gzip |
| Time to First Byte | < 200ms (CF edge) |
| Build time | < 60s (1000 pages) |

**SEO checklist auto-applied per page**:
- [x] Unique title (max 60 char)
- [x] Meta description (150-160 char)
- [x] Canonical URL
- [x] OG + Twitter card
- [x] H1 unique
- [x] Schema markup phù hợp type
- [x] Breadcrumbs visual + schema
- [x] Image alt text
- [x] Internal links 3-5/bài
- [x] External link rel="noopener noreferrer"
- [x] Affiliate link rel="nofollow sponsored"

---

## 10. Scaling Path (sau MVP)

| Phase | Trigger | Action |
|---|---|---|
| **MVP** | Now | Astro + Cloudflare Pages + D1, file-based content |
| **Phase 2** | 100+ posts | Add Pagefind search, admin dashboard cho click stats |
| **Phase 3** | 1000+ posts hoặc team | Migrate content sang Sanity/Strapi headless CMS |
| **Phase 4** | 100k+ traffic/tháng | CDN images (Cloudinary), advanced caching strategy |
| **Phase 5** | Multi-language | Astro i18n routing, dịch sang Thai/Indo... |

---

## 11. Open Questions / Decisions Pending Approval

1. **Package manager**: pnpm (recommend) hay npm? → bạn quen cái nào?
2. **Tailwind hay UnoCSS**? → recommend Tailwind (lớn nhất ecosystem)
3. **React hay Vue hay Svelte cho islands?** → recommend React (Claude generate dễ nhất)
4. **Domain name cuối cùng**?
5. **Plausible cloud ($9/mo) hay Umami self-host?** → MVP đi Plausible free trial / GoatCounter (free)
6. **Có cần dark mode không?** → MVP skip, thêm sau
7. **Có cần admin dashboard tự build không?** → MVP skip, dùng Cloudflare dashboard + D1 console
8. **Có cần PWA + offline?** → MVP skip
9. **Newsletter MVP launch luôn hay sau?** → recommend launch luôn để build list từ ngày 1

---

## 12. Next Step Approval Checklist

Khi bạn duyệt plan này, tôi sẽ scaffold theo thứ tự:

- [ ] **Stage 1** — Project init: `package.json`, `astro.config.mjs`, `tailwind.config.mjs`, `tsconfig.json`, `.gitignore`, `.env.example`, README
- [ ] **Stage 2** — Content schema: `src/content/config.ts`, folder structure, sample author
- [ ] **Stage 3** — Base layout + SEO: `BaseLayout`, `BaseSeo`, schema components
- [ ] **Stage 4** — Navigation: Header, Footer, Breadcrumbs
- [ ] **Stage 5** — Post layouts: Post, Review, Comparison, Guide, FAQ, Pillar
- [ ] **Stage 6** — Affiliate module: `<AffiliateLink>`, `/go/[slug]` endpoint, links.yaml
- [ ] **Stage 7** — Homepage + cluster routing
- [ ] **Stage 8** — Tools: 1 calculator + 1 quiz làm mẫu
- [ ] **Stage 9** — Sample content: 2 review posts + 1 comparison + 1 pillar (để verify hoạt động)
- [ ] **Stage 10** — Sitemap, RSS, robots, 404
- [ ] **Stage 11** — Cloudflare config: `wrangler.toml`, D1 migration, Pages Function
- [ ] **Stage 12** — README với hướng dẫn dev/deploy

Estimate: 12 stages, mỗi stage ~5-15 files. Tổng ~80-100 files cho MVP.

---

## 13. Bạn review và confirm

Bạn check qua plan trên, nếu OK thì tôi bắt đầu Stage 1. Nếu muốn đổi gì (tech choice, structure, module priority) thì nói trước khi tôi scaffold.

Câu hỏi cụ thể cần bạn quyết:
1. Approve toàn bộ stack (Astro + Tailwind + React + TS + CF Pages)?
2. Package manager preference (pnpm/npm/yarn)?
3. Có muốn skip module nào ở MVP không?
4. Có muốn thêm module nào không có trong list không?
