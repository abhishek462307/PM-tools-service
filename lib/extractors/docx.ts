/**
 * DOCX text extractor.
 */
import mammoth from 'mammoth'

export async function extractDocx(buffer: Buffer): Promise<{ text: string }> {
  const result = await mammoth.extractRawText({ buffer })
  return { text: result.value ?? '' }
}
