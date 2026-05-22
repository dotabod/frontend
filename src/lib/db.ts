import { PrismaClient as PrismaMongo } from '.prisma-mongo/client'
import { PrismaClient } from '@prisma/client'

// Extend the global object for TypeScript so the singletons survive hot reloads
declare global {
  var prismaGlobal: PrismaClient | undefined
  var prismaMongoGlobal: PrismaMongo | undefined
}

// Create singleton instances for both clients
export const prisma = globalThis.prismaGlobal || new PrismaClient()
export const prismaMongo = globalThis.prismaMongoGlobal || new PrismaMongo()

// Only store the instances on the global object in development to prevent
// multiple instances during hot-reloading
if (process.env.VERCEL_ENV !== 'production') {
  globalThis.prismaGlobal = prisma
  globalThis.prismaMongoGlobal = prismaMongo
}

// Helper to check which database type we're dealing with
export function isMongoClient(client: PrismaClient | PrismaMongo): client is PrismaMongo {
  return 'cards' in client
}

/**
 * Use this function to get the appropriate client based on the database type needed
 * Example: getDbClient('mongodb') or getDbClient('postgres')
 */
export function getDbClient(type: 'mongodb' | 'postgres') {
  return type === 'mongodb' ? prismaMongo : prisma
}

/**
 * Disconnect both clients when shutting down the application
 */
export async function disconnectAllClients() {
  await Promise.all([prisma.$disconnect(), prismaMongo.$disconnect()])
}

export type { PrismaMongo }

/**
 * Type helpers for MongoDB collections
 * These types make it easier to work with MongoDB document types
 */
export type NotablePlayer = NonNullable<
  Awaited<ReturnType<typeof prismaMongo.notablePlayers.findUnique>>
>
export type Card = NonNullable<Awaited<ReturnType<typeof prismaMongo.cards.findUnique>>>

export default prisma
