import { z } from 'zod'

const deploymentSchema = z.object({
  preview: z.object({
    name: z.string().min(1),
    worker_name: z.literal('frontend'),
    urls: z.array(z.string().url()).min(1),
  }),
})

// Use Cloudflare's stable branch URL, never the unique deployment URL or a request header.
export function previewAuthTarget(output) {
  const { preview } = deploymentSchema.parse(JSON.parse(output))
  const url = new URL(preview.urls[0])
  const trustedHost =
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?-frontend\.ketodev\.workers\.dev$/.test(url.hostname) ||
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.dev\.dotabod\.com$/.test(url.hostname)

  if (
    !trustedHost ||
    url.protocol !== 'https:' ||
    url.port ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('Cloudflare returned an unexpected Preview origin')
  }

  return { name: preview.name, origin: url.origin, workerName: preview.worker_name }
}
