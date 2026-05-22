import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPublishedPosts, postUrl } from '@lib/content';

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();
  const site = context.site?.toString() ?? 'https://affiliate-hub.vn/';

  return rss({
    title: 'Affiliate Hub — Tài chính cá nhân Việt Nam',
    description:
      'Review thẻ tín dụng, app vay, ngân hàng số, chứng khoán, crypto. Honest review, không quảng cáo trá hình.',
    site,
    customData: `<language>vi-VN</language>`,
    items: posts.slice(0, 50).map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: postUrl(post),
      author: (post.data.author as { id?: string; slug?: string }).id ?? (post.data.author as { id?: string; slug?: string }).slug ?? '',
    })),
  });
}
