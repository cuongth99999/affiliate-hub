import { canonicalUrl } from './utils';

export interface SeoMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  ogType?: 'website' | 'article';
  noindex?: boolean;
  publishedDate?: string;
  modifiedDate?: string;
  author?: string;
}

export interface BuildMetaOptions {
  title: string;
  description: string;
  path: string;
  siteUrl: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noindex?: boolean;
  publishedDate?: Date | string;
  modifiedDate?: Date | string;
  author?: string;
}

const SITE_NAME = 'Affiliate Hub';
const DEFAULT_OG = '/og-default.jpg';

export function buildMeta(opts: BuildMetaOptions): SeoMeta {
  const fullTitle = opts.title.includes(SITE_NAME)
    ? opts.title
    : `${opts.title} | ${SITE_NAME}`;

  return {
    title: fullTitle.slice(0, 70),
    description: opts.description.slice(0, 170),
    canonical: canonicalUrl(opts.path, opts.siteUrl),
    ogImage: opts.ogImage
      ? opts.ogImage.startsWith('http')
        ? opts.ogImage
        : `${opts.siteUrl}${opts.ogImage}`
      : `${opts.siteUrl}${DEFAULT_OG}`,
    ogType: opts.ogType ?? 'website',
    noindex: opts.noindex ?? false,
    publishedDate:
      opts.publishedDate instanceof Date
        ? opts.publishedDate.toISOString()
        : opts.publishedDate,
    modifiedDate:
      opts.modifiedDate instanceof Date
        ? opts.modifiedDate.toISOString()
        : opts.modifiedDate,
    author: opts.author,
  };
}
