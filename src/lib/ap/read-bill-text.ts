import { tmpdir } from "node:os"

import { PNG } from "pngjs"
import { createWorker } from "tesseract.js"
import { extractImages, extractText, getDocumentProxy } from "unpdf"

const MIN_TEXT_CHARS = 40

function significantChars(value: string) {
  return value.replace(/\s+/g, " ").trim().length
}

function encodePng(image: {
  data: Uint8ClampedArray
  width: number
  height: number
  channels: 1 | 3 | 4
}) {
  const png = new PNG({ width: image.width, height: image.height })
  const src = image.data
  const dest = png.data
  if (!dest) {
    throw new Error("Could not allocate PNG buffer for OCR.")
  }

  for (let i = 0, p = 0; i < dest.length; i += 4, p += image.channels) {
    if (image.channels === 1) {
      const gray = src[p] ?? 0
      dest[i] = gray
      dest[i + 1] = gray
      dest[i + 2] = gray
      dest[i + 3] = 255
    } else if (image.channels === 3) {
      dest[i] = src[p] ?? 0
      dest[i + 1] = src[p + 1] ?? 0
      dest[i + 2] = src[p + 2] ?? 0
      dest[i + 3] = 255
    } else {
      dest[i] = src[p] ?? 0
      dest[i + 1] = src[p + 1] ?? 0
      dest[i + 2] = src[p + 2] ?? 0
      dest[i + 3] = src[p + 3] ?? 255
    }
  }

  return PNG.sync.write(png)
}

async function ocrImage(image: Buffer) {
  const worker = await createWorker("eng", 1, {
    cachePath: tmpdir(),
    gzip: true,
  })
  try {
    const result = await worker.recognize(image)
    return result.data.text ?? ""
  } finally {
    await worker.terminate()
  }
}

async function ocrPdfImages(bytes: Uint8Array) {
  const pdf = await getDocumentProxy(bytes, { maxImageSize: 16_777_216 })
  const pages = Math.min(pdf.numPages, 3)
  const chunks: string[] = []

  for (let page = 1; page <= pages; page += 1) {
    const images = await extractImages(pdf, page)
    for (const image of images) {
      if (image.width < 40 || image.height < 40) continue
      chunks.push(await ocrImage(encodePng(image)))
    }
  }

  return chunks.join("\n")
}

export async function readBillText(
  bytes: Uint8Array,
  mediaType: string
): Promise<string> {
  if (mediaType === "application/pdf") {
    const pdf = await getDocumentProxy(bytes, { maxImageSize: 16_777_216 })
    const extracted = await extractText(pdf, { mergePages: true })
    const pdfText = Array.isArray(extracted.text)
      ? extracted.text.join("\n")
      : extracted.text

    if (significantChars(pdfText) >= MIN_TEXT_CHARS) {
      return pdfText
    }

    const ocrText = await ocrPdfImages(bytes)
    return [pdfText, ocrText].filter(Boolean).join("\n")
  }

  return ocrImage(Buffer.from(bytes))
}
