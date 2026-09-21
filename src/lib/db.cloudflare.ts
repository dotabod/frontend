import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { env } from 'cloudflare:workers'

import type { PrismaClient as PrismaMongoClient } from '.prisma-mongo/client'

const createPrismaClient = () => {
  const adapter = new PrismaPg({
    connectionString: env.HYPERDRIVE.connectionString,
  })

  return new PrismaClient({ adapter })
}

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: The Proxy forwards every requested member to a real per-request PrismaClient instance.
const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = createPrismaClient()
    // oxlint-disable-next-line anti-slop/no-reflect-get, typescript/no-unsafe-assignment -- PrismaClient's generated members are only addressable here by the Proxy trap key.
    const value = Reflect.get(client, property, client)

    // oxlint-disable-next-line anti-slop/no-runtime-typeof, typescript/no-unsafe-call, typescript/no-unsafe-member-access, typescript/no-unsafe-return -- Methods must retain the concrete PrismaClient receiver; generated delegates are returned unchanged.
    return typeof value === 'function' ? value.bind(client) : value
  },
})

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: The Proxy deliberately rejects every MongoDB client member on the unsupported Workers runtime.
export const prismaMongo = new Proxy({} as PrismaMongoClient, {
  get() {
    throw new Error('MongoDB Prisma is not supported on Cloudflare Workers')
  },
})

export type NotablePlayer = NonNullable<
  Awaited<ReturnType<PrismaMongoClient['notablePlayers']['findUnique']>>
>

export default prisma
