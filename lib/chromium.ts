/**
 * Chromium launcher helper for Vercel serverless.
 * Uses @sparticuz/chromium (lightweight binary) + puppeteer-core.
 */
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

let _browser: import('puppeteer-core').Browser | null = null

export async function getBrowser(): Promise<import('puppeteer-core').Browser> {
  if (_browser && _browser.connected) return _browser

  _browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless as any,
    ignoreDefaultArgs: ['--disable-extensions'],
  })
  return _browser
}

export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close()
    _browser = null
  }
}

export function getUserAgent(): string {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  ]
  return agents[Math.floor(Math.random() * agents.length)]
}
