import { readFile } from "node:fs/promises"
import { createResult, createResultError, type Result } from "@adaptive-ds/result"

const maxImageBytes = 4_000_000

const imageMimeSniff = (bytes: Buffer, path: string): string | undefined => {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png"
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg"
  if (bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP")
    return "image/webp"
  const extension = path.toLowerCase().split(".").pop()
  if (extension === "png") return "image/png"
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg"
  if (extension === "webp") return "image/webp"
  return undefined
}

export async function cliImagesRead(input: string | undefined): Promise<Result<string[] | undefined>> {
  const op = "cliImagesRead"
  if (input === undefined || input.trim().length === 0) return createResult(undefined)
  const paths = input
    .split(",")
    .map((path) => path.trim())
    .filter(Boolean)

  const images: string[] = []
  for (const path of paths) {
    let bytes: Buffer
    try {
      bytes = await readFile(path)
    } catch {
      return createResultError(op, `The image file could not be read: ${path}`)
    }
    if (bytes.length === 0) return createResultError(op, `The image file was empty: ${path}`)
    if (bytes.length > maxImageBytes) return createResultError(op, `The image file exceeds 4 MiB: ${path}`)
    const mime = imageMimeSniff(bytes, path)
    if (mime === undefined) return createResultError(op, `The image must be PNG, JPEG, or WebP: ${path}`)
    images.push(`data:${mime};base64,${bytes.toString("base64")}`)
  }
  return createResult(images)
}
