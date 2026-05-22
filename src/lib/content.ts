import { getCollection, getEntry, getEntries, type CollectionEntry } from 'astro:content';
import type { Cluster, PostType } from '../content/config';

export const CLUSTER_LABELS: Record<Cluster, string> = {
  'the-tin-dung': 'Thẻ tín dụng',
  'vay-tieu-dung': 'Vay tiêu dùng',
  'tai-khoan-ngan-hang': 'Tài khoản ngân hàng',
  'chung-khoan': 'Chứng khoán',
  'crypto': 'Crypto',
  'tiet-kiem': 'Tiết kiệm',
  'bao-hiem': 'Bảo hiểm',
};

export const CLUSTER_DESCRIPTIONS: Record<Cluster, string> = {
  'the-tin-dung': 'Đánh giá, so sánh thẻ tín dụng và hướng dẫn mở thẻ phù hợp.',
  'vay-tieu-dung': 'Review các app vay tiêu dùng, lãi suất, cách vay an toàn.',
  'tai-khoan-ngan-hang': 'Ngân hàng số, ví điện tử, eKYC nhanh, phí thấp.',
  'chung-khoan': 'Mở tài khoản, so sánh sàn, kiến thức đầu tư cơ bản.',
  'crypto': 'Sàn giao dịch, hướng dẫn mua BTC, kiến thức Web3.',
  'tiet-kiem': 'Gửi tiết kiệm, lãi suất ngân hàng, kế hoạch tài chính.',
  'bao-hiem': 'Bảo hiểm nhân thọ, sức khỏe, tài sản — so sánh và lựa chọn.',
};

export const TYPE_LABELS: Record<PostType, string> = {
  pillar: 'Tổng quan',
  listicle: 'Top danh sách',
  review: 'Đánh giá',
  comparison: 'So sánh',
  guide: 'Hướng dẫn',
  faq: 'Câu hỏi',
  'kien-thuc': 'Kiến thức',
};

/**
 * URL path helpers — keep all path logic in one place
 */
export function clusterUrl(cluster: Cluster): string {
  return `/${cluster}/`;
}

export function postUrl(post: CollectionEntry<'posts'>): string {
  if (post.data.type === 'pillar') return `/${post.data.cluster}/`;
  // post.slug is the path from collection root (e.g. "the-tin-dung/review/vpbank-lady")
  return `/${post.slug}/`;
}

export function authorUrl(slug: string): string {
  return `/tac-gia/${slug}/`;
}

/**
 * Query helpers
 */
export async function getPublishedPosts() {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getPostsByCluster(cluster: Cluster) {
  return getCollection(
    'posts',
    ({ data }) => !data.draft && data.cluster === cluster && data.type !== 'pillar',
  );
}

export async function getPillarPost(cluster: Cluster) {
  const posts = await getCollection(
    'posts',
    ({ data }) => !data.draft && data.cluster === cluster && data.type === 'pillar',
  );
  return posts[0];
}

export async function getRelatedPosts(
  current: CollectionEntry<'posts'>,
  limit = 3,
): Promise<CollectionEntry<'posts'>[]> {
  // 1. Explicit related from frontmatter
  if (current.data.related && current.data.related.length > 0) {
    const explicit = await getEntries(current.data.related);
    const valid = explicit.filter(
      (p): p is CollectionEntry<'posts'> => p !== undefined,
    );
    if (valid.length >= limit) return valid.slice(0, limit);
  }

  // 2. Fall back to same cluster, different post, sorted by date
  const sameCluster = await getCollection(
    'posts',
    ({ data, slug }) =>
      !data.draft && data.cluster === current.data.cluster && slug !== current.slug,
  );
  return sameCluster
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, limit);
}

export function getReadingTimeMinutes(post: CollectionEntry<'posts'>): number {
  const text = post.body ?? '';
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}
