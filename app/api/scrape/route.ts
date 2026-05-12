import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { load } from 'cheerio'
import { getBrowser, closeBrowser, getUserAgent } from '@/lib/chromium'

const scrapeSchema = z.object({
  url: z.string().url(),
  waitForSelector: z.string().optional(),
  timeoutMs: z.number().int().min(1000).max(10000).default(8000),
})

async function scrapeStatic(url: string, timeoutMs: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': getUserAgent(),
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    return html
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

function sanitizeHtml(html: string) {
  const $ = load(html)
  $('script, style, nav, header, footer, aside, .advertisement, .ads, iframe').remove()
  const title = $('title').first().text().trim() || $('h1').first().text().trim() || ''
  const meta: Record<string, string> = {}
  $('meta').each((_i: number, el: any) => {
    const $el = $(el)
    const name = $el.attr('name') || $el.attr('property')
    const content = $el.attr('content')
    if (name && content) meta[name] = content
  })
  const text = $('body').text()
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim()
  const links: string[] = []
  $('a[href]').each((_i, el) => {
    const href = $(el).attr('href')
    if (href && href.startsWith('http')) links.push(href)
  })
  return { title, text: text.slice(0, 20000), links: [...new Set(links)].slice(0, 50), meta }
}

export async function POST(req: NextRequest) {
  let browser
  try {
    const body = await req.json()
    const { url, waitForSelector, timeoutMs } = scrapeSchema.parse(body)

    let html: string
    try {
      html = await scrapeStatic(url, Math.min(timeoutMs, 5000))
    } catch {
      // Fallback to Chromium for JS-heavy pages
      browser = await getBrowser()
      const page = await browser.newPage()
      await page.setUserAgent(getUserAgent())
      await page.setViewport({ width: 1280, height: 800 })
      await page.goto(url, { waitUntil: 'networkidle2', timeout: timeoutMs })
      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { timeout: 4000 })
      }
      html = await page.content()
      await page.close()
    }

    const result = sanitizeHtml(html)
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    console.error('[scrape]', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Scrape failed' },
      { status: 500 }
    )
  } finally {
    if (browser) await closeBrowser()
  }
}
