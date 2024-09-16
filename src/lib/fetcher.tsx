import { captureException } from '@sentry/nextjs'
export const fetcher = (url: string, param = null) =>
  fetch(url + (param || '')).then((r) => {
    try {
      return r.json().catch((e) => {
        captureException(e)
        return ''
      })
    } catch (e) {
      captureException(e)
      return ''
    }
  })
