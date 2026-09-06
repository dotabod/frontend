import { describe, expect, it } from 'vitest'

import { serializeJsonLd } from '@/lib/json-ld'

describe(serializeJsonLd, () => {
  it('keeps hostile text inside the JSON-LD data value', () => {
    const hostileName = '</script><script>window.profileXss = true</script>'
    const serialized = serializeJsonLd({
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      mainEntity: {
        '@type': 'Person',
        name: hostileName,
        url: 'https://twitch.tv/dotabod',
      },
      url: 'https://dotabod.com/dotabod',
    })

    expect(serialized).not.toContain('</script>')
    expect(serialized).not.toContain('<script>')
    expect(JSON.parse(serialized)).toMatchObject({ mainEntity: { name: hostileName } })
  })
})
