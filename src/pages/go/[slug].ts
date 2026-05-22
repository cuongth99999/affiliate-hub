import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/**
 * Dev-only redirect handler.
 *
 * In production, /go/[slug] is served by functions/go/[[slug]].ts on Cloudflare
 * (which also logs clicks to D1). This Astro endpoint is for local pnpm dev.
 *
 * NOTE: this requires SSR (output: 'server' or 'hybrid'). For pure static build,
 * we generate redirect HTML stubs instead (see getStaticPaths below).
 */
export async function getStaticPaths() {
  const links = await getCollection('affiliate-links', ({ data }) => data.active);
  return links.map((link) => ({
    params: { slug: link.id },
    props: { targetUrl: link.data.target_url },
  }));
}

export const GET: APIRoute = ({ props }) => {
  const targetUrl = (props as { targetUrl: string }).targetUrl;

  // Static HTML stub that redirects client-side.
  // CF Function will override this in production with edge redirect + D1 log.
  const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<title>Đang chuyển hướng...</title>
<meta http-equiv="refresh" content="0; url=${targetUrl}">
<link rel="canonical" href="${targetUrl}">
</head>
<body>
<p>Đang chuyển hướng tới <a href="${targetUrl}" rel="nofollow sponsored">${targetUrl}</a>...</p>
<script>window.location.replace(${JSON.stringify(targetUrl)});</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
};
