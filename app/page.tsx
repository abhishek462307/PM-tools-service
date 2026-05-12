export default function Home() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: 40 }}>
      <h1>Forge PM Tools Service</h1>
      <p>Self-hosted AI tool microservice.</p>
      <ul>
        <li><code>POST /api/search</code> — Web search (DuckDuckGo / Bing)</li>
        <li><code>POST /api/scrape</code> — Page scraping</li>
        <li><code>POST /api/extract</code> — File text extraction (PDF, DOCX, XLSX, CSV, images)</li>
      </ul>
    </main>
  )
}
