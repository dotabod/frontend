import { PrismaClient } from '@prisma/client'
// The path below will resolve after running the generate:mongo script
// We need to add @ts-ignore to prevent TypeScript errors before generation
// @ts-ignore
import { PrismaClient as PrismaMongo } from '.prisma-mongo/client'

declare let global: {
  prisma: PrismaClient
  prismaMongo: PrismaMongo
}

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more:
// https://pris.ly/d/help/next-js-best-practices

let prisma: PrismaClient
// @ts-ignore - for MongoDB client
let prismaMongo: PrismaMongo

if (process.env.VERCEL_ENV === 'production') {
  prisma = new PrismaClient()
  prismaMongo = new PrismaMongo()
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient()
  }
  if (!global.prismaMongo) {
    global.prismaMongo = new PrismaMongo()
  }
  prisma = global.prisma
  prismaMongo = global.prismaMongo
}

export default prisma
export { prismaMongo }
