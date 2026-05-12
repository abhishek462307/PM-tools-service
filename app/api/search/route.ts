import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getBrowser, closeBrowser, getUserAgent } from '@/lib/chromium'

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  engine: z.enum(['duckduckgo', 'bing']).default('duckduckgo'),
  maxResults: z.number().int().min(1).max(10).default(5),
})

export async function POST(req: NextRequest) {
  let browser
  try {
    const body = await req.json()
    const { query, engine, maxResults } = searchSchema.parse(body)

    browser = await getBrowser()
    const page = await browser.newPage()
    await page.setUserAgent(getUserAgent())
    await page.setViewport({ width: 1280, height: 800 })

    let results: { title: string; url: string; snippet: string }[] = []

    if (engine === 'duckduckgo') {
      const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 8000 })
      await page.waitForSelector('.result__a, .result__snippet', { timeout: 5000 })

      results = await page.evaluate((max: number) => {
        const out: { title: string; url: string; snippet: string }[] = []
        const links = document.querySelectorAll('.result__a')
        const snippets = document.querySelectorAll('.result__snippet')
        for (let i = 0; i < Math.min(links.length, snippets.length, max); i++) {
          const a = links[i] as HTMLAnchorElement
          const s = snippets[i] as HTMLElement
          if (a && s) {
            out.push({ title: a.textContent?.trim() ?? '', url: a.href, snippet: s.textContent?.trim() ?? '' })
          }
        }
        return out
      }, maxResults)
    } else {
      const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 8000 })
      await page.waitForSelector('.b_algo, .b_caption', { timeout: 5000 })

      results = await page.evaluate((max: number) => {
        const out: { title: string; url: string; snippet: string }[] = []
        const items = document.querySelectorAll('.b_algo')
        for (let i = 0; i < Math.min(items.length, max); i++) {
          const item = items[i]
          const a = item.querySelector('a') as HTMLAnchorElement | null
          const s = item.querySelector('.b_caption') as HTMLElement | null
          if (a) {
            out.push({
              title: a.textContent?.trim() ?? '',
              url: a.href,
              snippet: s?.textContent?.trim() ?? '',
            })
          }
        }
        return out
      }, maxResults)
    }

    await page.close()
    return NextResponse.json({ success: true, data: results })
  } catch (err) {
    console.error('[search]', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Search failed' },
      { status: 500 }
    )
  } finally {
    if (browser) await closeBrowser()
  }
}
