export const fetcher = (url: string, param = null) =>
  fetch(url + (param || '')).then((r) => r.json())
