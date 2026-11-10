import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import LandingPage from '../components/LandingPage.vue'
import { PAGES, findPage } from '../content/pages'
import { renderHead } from './head'

const siteUrl =
  ((globalThis as Record<string, unknown>).__SITE_URL__ as string | undefined) ??
  'https://your-domain.com'

export const routes = PAGES.map((page) => ({ path: page.path }))

export async function renderPage(path: string): Promise<{ html: string; head: string }> {
  const page = findPage(path)
  const app = createSSRApp({
    render: () => h(LandingPage, { page }),
  })
  const html = await renderToString(app)
  return { html, head: renderHead(page, siteUrl) }
}
