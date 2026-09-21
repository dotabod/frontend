import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

import { PrismaClient as PrismaMongo } from '.prisma-mongo/client'

// Extend the global object for TypeScript so the singletons survive hot reloads
declare global {
  var prismaGlobal: PrismaClient | undefined
  var prismaMongoGlobal: PrismaMongo | undefined
}

const isCloudflareRuntime = process.env.DOTABOD_RUNTIME === 'cloudflare'

const createCloudflarePrismaClient = () => {
  const hyperdrive = globalThis.hyperdriveGlobal
  if (!hyperdrive) {
    throw new Error('Missing HYPERDRIVE binding')
  }

  const adapter = new PrismaPg({
    connectionString: hyperdrive.connectionString,
  })

  return new PrismaClient({ adapter })
}

const createCloudflarePrismaProxy = () => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: The Proxy forwards every requested member to a real per-request PrismaClient instance.
  return new Proxy({} as PrismaClient, {
    get(_target, property) {
      const client = createCloudflarePrismaClient()
      // oxlint-disable-next-line anti-slop/no-reflect-get, typescript/no-unsafe-assignment -- PrismaClient's generated members are only addressable here by the Proxy trap key.
      const value = Reflect.get(client, property, client)

      // oxlint-disable-next-line anti-slop/no-runtime-typeof, typescript/no-unsafe-call, typescript/no-unsafe-member-access, typescript/no-unsafe-return -- Methods must retain the concrete PrismaClient receiver; generated delegates are returned unchanged.
      return typeof value === 'function' ? value.bind(client) : value
    },
  })
}

const createUnavailableMongoProxy = () => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: The Proxy deliberately rejects every MongoDB client member on the unsupported Workers runtime.
  return new Proxy({} as PrismaMongo, {
    get() {
      throw new Error('MongoDB Prisma is not supported on Cloudflare Workers')
    },
  })
}

const prisma = isCloudflareRuntime
  ? createCloudflarePrismaProxy()
  : (globalThis.prismaGlobal ?? new PrismaClient())
export const prismaMongo = isCloudflareRuntime
  ? createUnavailableMongoProxy()
  : (globalThis.prismaMongoGlobal ?? new PrismaMongo())

// Only store the instances on the global object in development to prevent
// Multiple instances during hot-reloading
if (!isCloudflareRuntime && process.env.VERCEL_ENV !== 'production') {
  globalThis.prismaGlobal = prisma
  globalThis.prismaMongoGlobal = prismaMongo
}

// Helper to check which database type we're dealing with
/**
 * Type helpers for MongoDB collections
 * These types make it easier to work with MongoDB document types
 */
export type NotablePlayer = NonNullable<
  Awaited<ReturnType<typeof prismaMongo.notablePlayers.findUnique>>
>
export default prisma
