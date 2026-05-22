/**
 * Cloudflare Pages Function — /go/{slug}
 *
 * Resolves an affiliate slug → 302 redirects to the target URL, logging
 * the click event to D1 in the background.
 *
 * Link map is embedded at build time from src/content/affiliate-links/*.yaml
 * via scripts/build-affiliate-links.ts (output: functions/_affiliate-links.json).
 *
 * To add a new link: edit the YAML in src/content/affiliate-links/, then
 * commit + push. Cloudflare rebuilds, the new slug is live.
 */
import affiliateLinks from '../_affiliate-links.json';

interface Env {
  DB: D1Database;
}

interface LinkRecord {
  target_url: string;
  network?: string;
  campaign_id?: string;
  active: boolean;
}

const LINKS = affiliateLinks as Record<string, LinkRecord>;

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const slug = Array.isArray(params.slug) ? params.slug[0] : (params.slug as string);

  if (!slug) {
    return new Response('Missing slug', { status: 400 });
  }

  const link = LINKS[slug];
  if (!link || !link.active) {
    return new Response(`Affiliate link not found or inactive: ${slug}`, {
      status: 404,
      headers: { 'cache-control': 'no-store' },
    });
  }

  // Parse UTM params
  const url = new URL(request.url);
  const utm = {
    source: url.searchParams.get('utm_source') ?? null,
    medium: url.searchParams.get('utm_medium') ?? null,
    campaign: url.searchParams.get('utm_campaign') ?? null,
  };

  // Bot detection (lightweight)
  const ua = request.headers.get('user-agent') ?? '';
  const isBot = /bot|crawler|spider|crawling|preview/i.test(ua) ? 1 : 0;

  // Log to D1 (non-blocking — never block the redirect on logging failures)
  if (env.DB) {
    try {
      context.waitUntil(
        env.DB.prepare(
          `INSERT INTO click_events
             (slug, target_url, network, campaign_id, referrer, user_agent, country, city,
              utm_source, utm_medium, utm_campaign, is_bot)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            slug,
            link.target_url,
            link.network ?? null,
            link.campaign_id ?? null,
            request.headers.get('referer') ?? null,
            ua,
            request.cf?.country ?? null,
            request.cf?.city ?? null,
            utm.source,
            utm.medium,
            utm.campaign,
            isBot,
          )
          .run(),
      );
    } catch (err) {
      console.error('D1 log failed', err);
    }
  }

  return Response.redirect(link.target_url, 302);
};
