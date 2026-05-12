/**
 * PDF text extractor — page-by-page.
 */
import pdfParse from 'pdf-parse'

export async function extractPdf(buffer: Buffer): Promise<{ text: string; pages: number }> {
  const data = await pdfParse(buffer)
  return { text: data.text ?? '', pages: data.numpages ?? 0 }
}
