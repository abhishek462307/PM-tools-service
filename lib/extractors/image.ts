/**
 * Image extractor — returns base64 data URI for vision-model pass-through.
 */
export function extractImage(buffer: Buffer, mimetype: string): { text: string; base64: string } {
  const base64 = buffer.toString('base64')
  const dataUri = `data:${mimetype};base64,${base64}`
  return {
    text: `[Image file — ${mimetype} — ${Math.round(base64.length / 1024)} KB base64]`,
    base64: dataUri,
  }
}
