export const fetcher = (url: string, param = null) =>
  fetch(url + (param || '')).then(async (r) => {
    if (!r.ok) {
      const error = new Error(
        'An error occurred while fetching the data.'
      ) as Error & { info?: any; status?: number }
      error.info = await r.json().catch(() => null)
      error.status = r.status
      throw error
    }
    return r.json()
  })
