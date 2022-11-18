export const fetcher = (url, param) =>
  fetch(url + (param || '')).then((r) => r.json())
