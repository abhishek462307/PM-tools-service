/**
 * CSV text extractor — rows to readable text.
 */
import { parse } from 'csv-parse/sync'

export function extractCsv(buffer: Buffer): Promise<{ text: string; rows: number }> {
  const text = buffer.toString('utf-8')
  const records = parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true })
  const lines: string[] = []
  const limit = Math.min(records.length, 500)

  for (let i = 0; i < limit; i++) {
    const row = records[i]
    const kv = Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(', ')
    lines.push(kv)
  }

  if (records.length > limit) {
    lines.push(`... (${records.length - limit} more rows)`)
  }

  return Promise.resolve({ text: lines.join('\n'), rows: records.length })
}
