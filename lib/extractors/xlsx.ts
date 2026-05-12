/**
 * XLSX text extractor — flattens all sheets to readable text.
 */
import * as XLSX from 'xlsx'

export async function extractXlsx(buffer: Buffer): Promise<{ text: string; sheets: string[] }> {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const lines: string[] = []
  const sheetNames: string[] = []

  for (const sheetName of workbook.SheetNames) {
    sheetNames.push(sheetName)
    lines.push(`\n--- Sheet: ${sheetName} ---\n`)
    const sheet = workbook.Sheets[sheetName]
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]
    for (const row of json.slice(0, 500)) {
      const clean = row.map(c => String(c ?? '')).join(' | ')
      if (clean.trim()) lines.push(clean)
    }
    if (json.length > 500) lines.push(`... (${json.length - 500} more rows)`)
  }

  return { text: lines.join('\n'), sheets: sheetNames }
}
