export interface ProfileJsonLd {
  '@context': string
  '@type': string
  mainEntity: {
    '@type': string
    image?: string
    name: string
    url: string
  }
  url: string
}

export const serializeJsonLd = (profile: ProfileJsonLd): string =>
  JSON.stringify(profile)
    .replaceAll('&', '\\u0026')
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
