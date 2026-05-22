# Affiliate Hub

Vietnamese personal finance affiliate hub — Astro + Tailwind + Cloudflare Pages.

See `PROJECT_PLAN.md` for business plan, `TECH_ARCHITECTURE.md` for technical architecture.

## Quick start

```bash
# Install Node 20+ (use .nvmrc)
nvm use

# Install dependencies
pnpm install

# Start dev server (http://localhost:4321)
pnpm dev

# Type check
pnpm check

# Build for production
pnpm build

# Preview prod build locally
pnpm preview
```

## Project structure

See `TECH_ARCHITECTURE.md` section 3 for full tree.

```
src/
├── content/          MDX content collections + YAML data
├── layouts/          Page templates (Post, Review, Comparison, ...)
├── components/       UI, affiliate, content, SEO, navigation, tools
├── pages/            File-based routes
├── lib/              Utilities (SEO, schema, content helpers)
└── styles/           Global CSS

functions/            Cloudflare Pages Functions (edge)
scripts/              Dev/maintenance scripts
migrations/           D1 SQL schemas
```

## Content workflow

```bash
# Generate AI draft for a new post
pnpm draft --type review --product vpbank-lady

# Edit src/content/posts/{cluster}/{slug}.mdx
# Add images to public/img/posts/{slug}/

# Preview local
pnpm dev

# Commit + push (auto deploy)
git add . && git commit -m "post: ..." && git push
```

## Add a new affiliate link

1. Edit `src/content/affiliate-links/links.yaml` — add new entry
2. Use in any MDX/Astro file: `<AffiliateLink slug="my-new-slug">CTA text</AffiliateLink>`
3. Commit + push — `/go/my-new-slug` works immediately

## Deploy (Cloudflare Pages)

One-time setup:
```bash
# Login to Cloudflare
pnpm wrangler login

# Create D1 database
pnpm d1:create

# Bind D1 to project (update wrangler.toml with returned database_id)
# Run initial migration
pnpm d1:migrate:prod
```

Deploy flow:
- Connect GitHub repo to Cloudflare Pages dashboard
- Set build command: `pnpm build`
- Set output directory: `dist`
- Set env vars from `.env.example`
- Every push to `main` auto-deploys; PRs get preview URLs

## Scripts

### Site build
| Command | Description |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build with type check |
| `pnpm check` | Astro type check |
| `pnpm format` | Format all files with Prettier |

### Accesstrade automation pipeline
See `ACCESSTRADE_AUTOMATION.md` for full architecture.

| Command | Description |
|---|---|
| `pnpm at:sync` | Pull active campaigns from Accesstrade → `src/content/affiliate-links/*.yaml` |
| `pnpm at:hot` | Find hot campaigns ready for a draft (debug, prints JSON) |
| `pnpm at:conversions` | Pull last 7 days conversion stats → Cloudflare D1 |
| `pnpm draft:one <campaignId>` | Manually generate a single review draft |
| `pnpm draft:weekly` | Run the full weekly draft pipeline (sync + hot + draft + commit) |
| `pnpm stats:weekly` | Run weekly conversion stats sync |
| `pnpm notify:test` | Send a test Telegram message |

### Automation setup checklist

1. Copy `.env.example` → `.env` and fill in:
   - `ACCESSTRADE_API_TOKEN` (Accesstrade dashboard → Publisher API)
   - `ANTHROPIC_API_KEY` (console.anthropic.com)
   - `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (chat @BotFather)
2. Test manual run: `pnpm at:sync && pnpm at:hot`
3. Test draft: `pnpm draft:one <campaignId>`
4. Set GitHub Secrets (same vars) for scheduled workflows
5. The cron runs Monday 9AM Vietnam and Sunday 23:00 Vietnam — see `.github/workflows/`

## License

Private — © 2026
