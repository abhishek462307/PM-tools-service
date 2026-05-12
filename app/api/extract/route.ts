import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { extractPdf, extractDocx, extractXlsx, extractCsv, extractImage } from '@/lib/extractors'

const MAX_FILE_MB = 20

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
  }
  return map[ext] ?? 'application/octet-stream'
}

export async function POST(req: NextRequest) {
  try {
    let buffer: Buffer
    let filename: string
    let mimetype: string
    let ext: string
    let maxChars = 10000

    const contentType = req.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('file') as File | null
      const maxCharsRaw = form.get('maxChars')
      maxChars = maxCharsRaw ? parseInt(String(maxCharsRaw), 10) || 10000 : 10000

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        return NextResponse.json({ success: false, error: `File too large (max ${MAX_FILE_MB}MB)` }, { status: 413 })
      }
      filename = file.name
      mimetype = getMimeType(filename)
      buffer = Buffer.from(await file.arrayBuffer())
      ext = filename.split('.').pop()?.toLowerCase() ?? ''
    } else {
      const body = await req.json()
      if (!body.base64 || !body.filename) {
        return NextResponse.json({ success: false, error: 'Missing base64 or filename' }, { status: 400 })
      }
      maxChars = body.maxChars ?? 10000
      filename = body.filename
      mimetype = body.mimeType || getMimeType(filename)
      buffer = Buffer.from(body.base64, 'base64')
      ext = filename.split('.').pop()?.toLowerCase() ?? ''
      if (buffer.length > MAX_FILE_MB * 1024 * 1024) {
        return NextResponse.json({ success: false, error: `File too large (max ${MAX_FILE_MB}MB)` }, { status: 413 })
      }
    }

    let result: { text: string; pages?: number; rows?: number; sheets?: string[]; base64?: string }

    switch (ext) {
      case 'pdf': {
        const pdf = await extractPdf(buffer)
        result = { text: pdf.text.slice(0, maxChars), pages: pdf.pages }
        break
      }
      case 'docx': {
        const docx = await extractDocx(buffer)
        result = { text: docx.text.slice(0, maxChars) }
        break
      }
      case 'xlsx': {
        const xlsx = await extractXlsx(buffer)
        result = { text: xlsx.text.slice(0, maxChars), sheets: xlsx.sheets }
        break
      }
      case 'csv': {
        const csv = await extractCsv(buffer)
        result = { text: csv.text.slice(0, maxChars), rows: csv.rows }
        break
      }
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
      case 'bmp': {
        const img = extractImage(buffer, mimetype)
        result = { text: img.text, base64: img.base64 }
        break
      }
      default:
        return NextResponse.json({ success: false, error: `Unsupported file type: ${ext}` }, { status: 415 })
    }

    return NextResponse.json({
      success: true,
      data: { filename, type: mimetype, ext, ...result },
    })
  } catch (err) {
    console.error('[extract]', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Extraction failed' },
      { status: 500 }
    )
  }
}
