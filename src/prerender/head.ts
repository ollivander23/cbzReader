import type { PageContent } from '../content/pages'
import { SITE } from '../content/site'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function scriptJson(data: unknown): string {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return `<script type="application/ld+json">${json}</script>`
}

function absolute(siteUrl: string, path: string): string {
  return `${siteUrl.replace(/\/$/, '')}${path}`
}

function buildSchema(page: PageContent, url: string, siteUrl: string): unknown {
  const organizationId = `${siteUrl}/#organization`
  const graph: unknown[] = [
    {
      '@type': 'Organization',
      '@id': organizationId,
      name: SITE.name,
      url: `${siteUrl}/`,
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: SITE.name,
      description: SITE.description,
      inLanguage: 'en',
      publisher: { '@id': organizationId },
    },
  ]

  if (page.schema === 'app') {
    graph.push({
      '@type': 'WebApplication',
      '@id': `${url}#app`,
      name: SITE.name,
      url,
      description: page.description,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Any (web browser)',
      browserRequirements: 'Requires JavaScript',
      inLanguage: 'en',
      isAccessibleForFree: true,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      featureList: [
        'Open CBZ and ZIP comic archives locally',
        'Right-to-left manga reading mode',
        'Single-page and double-page layouts',
        'Zoom and pan',
        'Local reading progress',
      ],
      publisher: { '@id': organizationId },
    })
  } else {
    graph.push({
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: page.h1,
      description: page.description,
      url,
      mainEntityOfPage: url,
      datePublished: page.updated,
      dateModified: page.updated,
      inLanguage: 'en',
      author: { '@id': organizationId },
      publisher: { '@id': organizationId },
    })
  }

  if (page.faq.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: page.faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    })
  }

  if (page.path !== '/') {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'CBZ Reader', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: page.h1, item: url },
      ],
    })
  }

  return { '@context': 'https://schema.org', '@graph': graph }
}

export function renderHead(page: PageContent, siteUrl: string): string {
  const url = absolute(siteUrl, page.path)
  const title = escapeHtml(page.title)
  const description = escapeHtml(page.description)
  const ogType = page.schema === 'app' ? 'website' : 'article'
  const ogImage = `${siteUrl.replace(/\/$/, '')}/og-image.png`
  const schema = scriptJson(buildSchema(page, url, siteUrl))

  return `<title>${title}</title>
<meta name="description" content="${description}" />
<link rel="canonical" href="${url}" />
<link rel="alternate" hreflang="en" href="${url}" />
<link rel="alternate" hreflang="x-default" href="${url}" />
<meta name="robots" content="index,follow,max-image-preview:large" />
<meta name="theme-color" content="#0d0d12" />
<meta property="og:type" content="${ogType}" />
<meta property="og:site_name" content="${escapeHtml(SITE.name)}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${url}" />
<meta property="og:locale" content="en_US" />
<meta property="og:image" content="${ogImage}" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${title}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${ogImage}" />
<meta name="twitter:image:alt" content="${title}" />
<script defer src="https://cloud.umami.is/script.js" data-website-id="3f17a819-f15d-4d7f-8143-ed16f426b12e"></script>
${schema}`
}
