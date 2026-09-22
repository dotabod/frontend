import { z } from 'zod'

const deploymentSchema = z.object({
  preview: z.object({
    name: z.string().min(1),
    urls: z.array(z.string().min(1)).min(1),
    worker_name: z.literal('frontend'),
  }),
})

// Use Cloudflare's stable branch URL, never the unique deployment URL or a request header.
/** @param {string} output */
export const previewAuthTarget = (output) => {
  const { preview } = deploymentSchema.parse(JSON.parse(output))
  const url = new URL(preview.urls[0])
  const trustedOrigin =
    /^https:\/\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?-frontend\.ketodev\.workers\.dev$/u.test(
      url.origin,
    ) || /^https:\/\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.dev\.dotabod\.com$/u.test(url.origin)

  if (!trustedOrigin || url.href !== `${url.origin}/`) {
    throw new Error('Cloudflare returned an unexpected Preview origin')
  }

  return { name: preview.name, origin: url.origin, workerName: preview.worker_name }
}
