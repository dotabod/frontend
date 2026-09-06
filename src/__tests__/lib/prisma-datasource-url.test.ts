import { describe, expect, it } from 'vitest'

import { getPrismaDatasourceUrl } from '@/lib/prisma-datasource-url'

describe(getPrismaDatasourceUrl, () => {
  const databaseUrl =
    'postgresql://postgres:secret%2Fvalue@db.example.com:6543/postgres?schema=public&pgbouncer=true'

  it('limits each Vercel function to one PostgreSQL connection', () => {
    expect(getPrismaDatasourceUrl(databaseUrl, true)).toBe(`${databaseUrl}&connection_limit=1`)
  })

  it('overrides a higher connection limit on Vercel', () => {
    expect(
      getPrismaDatasourceUrl(
        'postgresql://postgres:secret@db.example.com:5432/postgres?connection_limit=10&schema=public',
        true,
      ),
    ).toBe(
      'postgresql://postgres:secret@db.example.com:5432/postgres?connection_limit=1&schema=public',
    )
  })

  it('leaves non-Vercel database URLs unchanged', () => {
    expect(getPrismaDatasourceUrl(databaseUrl, false)).toBe(databaseUrl)
  })

  it('allows Prisma to use its schema datasource when DATABASE_URL is absent', () => {
    expect(getPrismaDatasourceUrl(undefined, true)).toBeUndefined()
  })
})
