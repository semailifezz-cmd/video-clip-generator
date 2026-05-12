import { put } from '@vercel/blob'

// Downloads an asset from a URL and uploads it to Vercel Blob for a permanent URL.
// Falls back to the original URL if the token is missing or the store rejects the upload.
export async function persistUrl(sourceUrl: string, filename: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return sourceUrl

  try {
    const res = await fetch(sourceUrl)
    if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${sourceUrl}`)

    const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
    const buffer = await res.arrayBuffer()

    const { url } = await put(`video-clip-generator/${filename}`, buffer, {
      access: 'public',
      contentType,
    })

    return url
  } catch (err) {
    // Private store or transient error — return original URL so the workflow continues
    console.warn(`persistUrl: falling back to source URL (${(err as Error).message})`)
    return sourceUrl
  }
}
