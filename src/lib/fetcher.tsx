export const fetcher = (url: string, param = null) =>
  fetch(url + (param || '')).then((r) => {
    try {
      return r.json().catch((e) => {
        return ''
      })
    } catch (e) {
      return ''
    }
  })
