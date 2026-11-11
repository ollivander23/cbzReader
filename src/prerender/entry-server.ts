import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import DemoPage from '../components/DemoPage.vue'
import LandingPage from '../components/LandingPage.vue'
import { PAGES, findPage } from '../content/pages'
import { renderDemoHead, renderHead } from './head'

const siteUrl =
  ((globalThis as Record<string, unknown>).__SITE_URL__ as string | undefined) ??
  'https://your-domain.com'

export const routes = [
  ...PAGES.map((page) => ({ path: page.path })),
  // A device-testing entry: prerendered so it works without JS, but kept out
  // of the sitemap and marked noindex.
  { path: '/demo/', noindex: true },
]

export async function renderPage(path: string): Promise<{ html: string; head: string }> {
  if (path === '/demo/') {
    const demo = createSSRApp({ render: () => h(DemoPage) })
    return { html: await renderToString(demo), head: renderDemoHead(siteUrl) }
  }

  const page = findPage(path)
  const app = createSSRApp({
    render: () => h(LandingPage, { page }),
  })
  const html = await renderToString(app)
  return { html, head: renderHead(page, siteUrl) }
}
