# Forge PM Tools Service

Self-hosted AI tool microservice that gives the Ask AI web search, page scraping, and file text extraction.

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/search` | Web search via DuckDuckGo/Bing scraping |
| `POST` | `/api/scrape` | Fetch and extract text from any URL |
| `POST` | `/api/extract` | Extract text from PDF, DOCX, XLSX, CSV, images |

All endpoints return `{ success: boolean, data?: unknown, error?: string }`.

## Deploy to Vercel (Hobby)

1. **Create a new Vercel project** and link it to `apps/tools-service` (or the whole repo with root set to `apps/tools-service`)
2. **No env vars needed** — all tools are self-built
3. **Vercel config** is in `vercel.json`:
   - `maxDuration: 10` seconds
   - `memory: 1024` MB

## Local dev

```bash
pnpm dev     # runs on port 4000
```

## Stack

- `@sparticuz/chromium` + `puppeteer-core` — headless browser for search & JS scraping
- `cheerio` — static HTML parsing (fast path)
- `pdf-parse`, `mammoth`, `xlsx`, `csv-parse` — file extractors

## Constraints

- 10s serverless timeout → aggressive page timeouts
- 1024 MB memory → lazy imports for heavy parsers
- No persistent disk → everything in-memory
