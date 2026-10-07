import { readFile } from "node:fs/promises"

const mimeByExtension = (path: string): string => {
  if (path.toLowerCase().endsWith(".png")) return "image/png"
  if (path.toLowerCase().endsWith(".webp")) return "image/webp"
  return "image/jpeg"
}

export async function imageDataUrlRead(path: string): Promise<string> {
  return `data:${mimeByExtension(path)};base64,${(await readFile(path)).toString("base64")}`
}

export function exampleKeyRead(name: string): string {
  const value = process.env[name]
  if (value === undefined || value.trim().length === 0) {
    console.error(`Missing ${name} in the environment`)
    process.exit(1)
  }
  return value
}
