import { PrismaClient as PrismaMongo } from '.prisma-mongo/client'
import { PrismaClient } from '@prisma/client'

// Extend the global object for TypeScript so the singletons survive hot reloads
declare global {
  var prismaGlobal: PrismaClient | undefined
  var prismaMongoGlobal: PrismaMongo | undefined
}

// Create singleton instances for both clients
const prisma = globalThis.prismaGlobal || new PrismaClient()
export const prismaMongo = globalThis.prismaMongoGlobal || new PrismaMongo()

// Only store the instances on the global object in development to prevent
// multiple instances during hot-reloading
if (process.env.VERCEL_ENV !== 'production') {
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
