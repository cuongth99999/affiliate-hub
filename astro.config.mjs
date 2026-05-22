// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

// TODO: replace with real domain when registered
const SITE_URL = process.env.SITE_URL || 'https://affiliate-hub.vn';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  integrations: [
    mdx(),
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      filter: (page) =>
        !page.includes('/go/') &&
        !page.includes('/api/') &&
        !page.includes('/404'),
    }),
  ],
  markdown: {
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'append',
          properties: {
            class: 'header-anchor',
            ariaLabel: 'Anchor link',
          },
        },
      ],
    ],
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
  vite: {
    ssr: {
      noExternal: ['lucide-react'],
    },
  },
});
