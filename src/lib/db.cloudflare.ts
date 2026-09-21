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

const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = createPrismaClient()
    const value = Reflect.get(client, property, client)

    return typeof value === 'function' ? value.bind(client) : value
  },
})

export const prismaMongo = new Proxy({} as PrismaMongoClient, {
  get() {
    throw new Error('MongoDB Prisma is not supported on Cloudflare Workers')
  },
})

export type NotablePlayer = NonNullable<
  Awaited<ReturnType<PrismaMongoClient['notablePlayers']['findUnique']>>
>

export default prisma
