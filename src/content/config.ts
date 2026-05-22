import { defineCollection, reference, z } from 'astro:content';

/**
 * Cluster slugs (must match folder names under src/content/posts/)
 */
export const CLUSTERS = [
  'the-tin-dung',
  'vay-tieu-dung',
  'tai-khoan-ngan-hang',
  'chung-khoan',
  'crypto',
  'tiet-kiem',
  'bao-hiem',
] as const;
export type Cluster = (typeof CLUSTERS)[number];

/**
 * Post types — determines layout
 */
export const POST_TYPES = [
  'pillar',      // cluster intro page
  'listicle',    // "Top X" listicle
  'review',      // single product review
  'comparison',  // "A vs B"
  'guide',       // how-to
  'faq',         // FAQ post
  'kien-thuc',   // educational (kiến thức)
] as const;
export type PostType = (typeof POST_TYPES)[number];

/**
 * Product types
 */
export const PRODUCT_TYPES = [
  'credit-card',
  'bank-account',
  'wallet',
  'loan',
  'broker',
  'exchange',
  'insurance',
  'savings',
] as const;

/**
 * Affiliate networks
 */
export const AFFILIATE_NETWORKS = [
  'accesstrade',
  'masoffer',
  'adflex',
  'direct',
  'binance',
  'bybit',
  'tiktok-shop',
  'shopee',
  'lazada',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Posts collection
// ─────────────────────────────────────────────────────────────────────────────
const posts = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string().min(10).max(80),
      description: z.string().min(80).max(170),
      date: z.date(),
      modified: z.date().optional(),
      author: reference('authors'),
      cluster: z.enum(CLUSTERS),
      type: z.enum(POST_TYPES),
      product: reference('products').optional(),
      products: z.array(reference('products')).optional(),
      rating: z.number().min(0).max(5).optional(),
      pros: z.array(z.string()).optional(),
      cons: z.array(z.string()).optional(),
      affiliate_links: z.array(z.string()).optional(),
      related: z.array(reference('posts')).optional(),
      keywords: z.array(z.string()).min(1),
      featured_image: image().optional(),
      og_image: image().optional(),
      draft: z.boolean().default(false),
      faqs: z
        .array(
          z.object({
            q: z.string(),
            a: z.string(),
          }),
        )
        .optional(),
      steps: z
        .array(
          z.object({
            title: z.string(),
            description: z.string(),
            image: image().optional(),
          }),
        )
        .optional(),
    }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Authors collection
// ─────────────────────────────────────────────────────────────────────────────
const authors = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      bio: z.string().min(50).max(500),
      avatar: image().optional(),
      role: z.string().optional(),
      linkedin: z.string().url().optional(),
      twitter: z.string().url().optional(),
      email: z.string().email().optional(),
      expertise: z.array(z.string()),
      joined_date: z.date(),
    }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Products collection (data only, no markdown body)
// ─────────────────────────────────────────────────────────────────────────────
const products = defineCollection({
  type: 'data',
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      brand: z.string(),
      category: z.string(),
      type: z.enum(PRODUCT_TYPES),
      logo: image().optional(),
      short_description: z.string().max(200).optional(),
      specs: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
      pros: z.array(z.string()).optional(),
      cons: z.array(z.string()).optional(),
      conditions: z.record(z.string()).optional(),
      affiliate_slug: z.string().optional(),
      official_url: z.string().url().optional(),
    }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Affiliate links collection
// ─────────────────────────────────────────────────────────────────────────────
const affiliateLinks = defineCollection({
  type: 'data',
  schema: z.object({
    target_url: z.string().url(),
    network: z.enum(AFFILIATE_NETWORKS),
    campaign_id: z.string().optional(),
    payout_vnd: z.number().int().nonnegative().optional(),
    payout_percent: z.number().min(0).max(100).optional(),
    payout_type: z.enum(['CPL', 'CPQL', 'CPS', 'percent', 'hybrid']).optional(),
    product_slug: z.string().optional(),
    active: z.boolean().default(true),
    note: z.string().optional(),
    start_date: z.date().optional(),
    end_date: z.date().optional(),
  }),
});

export const collections = {
  posts,
  authors,
  products,
  'affiliate-links': affiliateLinks,
};
