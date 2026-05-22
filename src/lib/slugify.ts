/**
 * Convert Vietnamese text to URL-safe slug (no diacritics, hyphens, lowercase)
 *
 * Example: "Thẻ Tín Dụng VPBank" → "the-tin-dung-vpbank"
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Inverse: take a slug and produce a Title Case label for display
 * (best-effort, since we lost diacritics — only use for fallback display)
 */
export function deslugify(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
