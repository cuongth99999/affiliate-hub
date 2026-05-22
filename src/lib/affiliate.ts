import { getEntry } from 'astro:content';

/**
 * Resolve an affiliate slug to the internal /go/ URL used in markup.
 * The actual target redirect happens at /go/[slug] (Astro endpoint or CF function).
 */
export function affiliateUrl(slug: string): string {
  return `/go/${slug}/`;
}

/**
 * Verify an affiliate link slug exists (build-time check).
 * Returns the entry data or null. Use in build scripts to flag dead links.
 */
export async function getAffiliateLink(slug: string) {
  const entry = await getEntry('affiliate-links', slug);
  return entry ?? null;
}

/**
 * Attributes that should be applied to every outbound affiliate link
 * (SEO + transparency requirements).
 */
export const AFFILIATE_LINK_ATTRS = {
  rel: 'nofollow sponsored noopener',
  target: '_blank',
} as const;
