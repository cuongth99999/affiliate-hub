/**
 * JSON-LD schema.org builders.
 * Components in src/components/seo/ wrap these into <script> tags.
 */

const ORG_NAME = 'Affiliate Hub';

export function organizationSchema(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORG_NAME,
    url: siteUrl,
    logo: `${siteUrl}/img/brands/logo.svg`,
    sameAs: [
      // populate when social accounts created
    ],
  };
}

export function websiteSchema(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: ORG_NAME,
    url: siteUrl,
    inLanguage: 'vi-VN',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/tim-kiem/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface ArticleSchemaInput {
  headline: string;
  description: string;
  url: string;
  imageUrl: string;
  authorName: string;
  authorUrl: string;
  datePublished: string;
  dateModified: string;
  siteUrl: string;
}

export function articleSchema(input: ArticleSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    image: input.imageUrl,
    url: input.url,
    author: {
      '@type': 'Person',
      name: input.authorName,
      url: input.authorUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: ORG_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${input.siteUrl}/img/brands/logo.svg`,
      },
    },
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    mainEntityOfPage: input.url,
    inLanguage: 'vi-VN',
  };
}

export interface ReviewSchemaInput {
  productName: string;
  productBrand: string;
  productCategory: string;
  rating: number;
  bestRating?: number;
  reviewBody: string;
  authorName: string;
  datePublished: string;
  url: string;
}

export function reviewSchema(input: ReviewSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'Product',
      name: input.productName,
      brand: { '@type': 'Brand', name: input.productBrand },
      category: input.productCategory,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: input.rating,
      bestRating: input.bestRating ?? 5,
    },
    reviewBody: input.reviewBody,
    author: { '@type': 'Person', name: input.authorName },
    datePublished: input.datePublished,
    url: input.url,
  };
}

export interface FaqItem {
  q: string;
  a: string;
}

export function faqSchema(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

export interface HowToStep {
  title: string;
  description: string;
  image?: string;
}

export function howToSchema(name: string, steps: HowToStep[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.description,
      ...(s.image ? { image: s.image } : {}),
    })),
  };
}

export interface ItemListItem {
  name: string;
  url: string;
}

export function itemListSchema(items: ItemListItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: item.url,
    })),
  };
}
