import { z } from 'zod'

const deploymentSchema = z.object({
  preview_name: z.string().min(1),
  preview_urls: z.array(z.string().min(1)).min(1),
  type: z.literal('preview'),
  version: z.literal(1),
  worker_name: z.literal('frontend').default('frontend'),
})

// Use Cloudflare's stable branch URL, never the unique deployment URL or a request header.
/** @param {string} output - Wrangler's structured output file, ending with the Preview record. */
export const previewAuthTarget = (output) => {
  const preview = deploymentSchema.parse(JSON.parse(output.trim().split('\n').at(-1) ?? ''))
  const url = new URL(preview.preview_urls[0])
  const trustedOrigin =
    /^https:\/\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?-frontend\.ketodev\.workers\.dev$/u.test(
      url.origin,
    ) || /^https:\/\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.dev\.dotabod\.com$/u.test(url.origin)

  if (!trustedOrigin || url.href !== `${url.origin}/`) {
    throw new Error('Cloudflare returned an unexpected Preview origin')
  }

  return { name: preview.preview_name, origin: url.origin, workerName: preview.worker_name }
}
