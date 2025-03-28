import { PrismaClient } from '@prisma/client'
declare let global: { prisma: PrismaClient }

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more:
// https://pris.ly/d/help/next-js-best-practices

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    // Add this configuration to solve the engine not found issue
    datasourceUrl: process.env.DATABASE_URL,
  })
  prismaMongo = new PrismaMongo({
    // Add this configuration to solve the engine not found issue
    datasourceUrl: process.env.MONGODB_URL,
  })
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient()
  }
  prisma = global.prisma
}

export default prisma
