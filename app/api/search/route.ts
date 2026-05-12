import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getBrowser, closeBrowser, getUserAgent } from '@/lib/chromium'

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  engine: z.enum(['duckduckgo', 'bing']).default('duckduckgo'),
  maxResults: z.number().int().min(1).max(10).default(5),
})

function normalizeResultUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl)
    const duckDuckGoTarget = url.searchParams.get('uddg')
    if (url.hostname.includes('duckduckgo.com') && duckDuckGoTarget) {
      return decodeURIComponent(duckDuckGoTarget)
    }

    const bingTarget = url.searchParams.get('u')
    if (url.hostname.includes('bing.com') && bingTarget) {
      const encoded = bingTarget.replace(/^a1/, '')
      return Buffer.from(encoded, 'base64url').toString('utf8')
    }
  } catch {
    return rawUrl
  }
  return rawUrl
}

interface SearchResult {
  title: string
  url: string
  snippet: string
  image?: string
}

function cleanResults(results: SearchResult[], maxResults: number) {
  const seen = new Set<string>()

  return results
    .map(result => ({
      ...result,
      title: result.title.trim(),
      url: normalizeResultUrl(result.url),
      snippet: result.snippet.trim(),
    }))
    .filter(result => result.title && result.url)
    .filter(result => {
      try {
        const url = new URL(result.url)
        const isAd = url.hostname.includes('duckduckgo.com') && url.pathname.includes('/y.js')
        if (isAd) return false
      } catch {
        return false
      }
      if (seen.has(result.url)) return false
      seen.add(result.url)
      return true
    })
    .slice(0, maxResults)
}

export async function POST(req: NextRequest) {
  let browser
  try {
    const body = await req.json()
    const { query, engine, maxResults } = searchSchema.parse(body)

    browser = await getBrowser()
    const page = await browser.newPage()
    await page.setUserAgent(getUserAgent())
    await page.setViewport({ width: 1280, height: 800 })

    let results: SearchResult[] = []

    if (engine === 'duckduckgo') {
      const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 })
      await page.waitForSelector('.result__a, .result__snippet', { timeout: 5000 })

      results = await page.evaluate((max: number) => {
        const out: SearchResult[] = []
        const items = document.querySelectorAll('.result:not(.result--ad)')
        for (let i = 0; i < Math.min(items.length, max * 2); i++) {
          const item = items[i]
          const a = item.querySelector('.result__a') as HTMLAnchorElement | null
          const s = item.querySelector('.result__snippet') as HTMLElement | null
          const img = item.querySelector('.result__icon img, .result__img img, img') as HTMLImageElement | null
          if (a && s) {
            out.push({
              title: a.textContent?.trim() ?? '',
              url: a.href,
              snippet: s.textContent?.trim() ?? '',
              image: img?.src || undefined,
            })
          }
        }
        return out
      }, maxResults)
    } else {
      const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 })
      await page.waitForSelector('.b_algo, .b_caption', { timeout: 5000 })

      results = await page.evaluate((max: number) => {
        const out: SearchResult[] = []
        const items = document.querySelectorAll('.b_algo')
        for (let i = 0; i < Math.min(items.length, max * 2); i++) {
          const item = items[i]
          const a = item.querySelector('a') as HTMLAnchorElement | null
          const s = item.querySelector('.b_caption') as HTMLElement | null
          const img = item.querySelector('img') as HTMLImageElement | null
          if (a) {
            out.push({
              title: a.textContent?.trim() ?? '',
              url: a.href,
              snippet: s?.textContent?.trim() ?? '',
              image: img?.src || undefined,
            })
          }
        }
        return out
      }, maxResults)
    }

    await page.close()
    results = cleanResults(results, maxResults)
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
