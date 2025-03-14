import { PrismaClient } from '@prisma/client'
declare let global: { prisma: PrismaClient }

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more:
// https://pris.ly/d/help/next-js-best-practices

let prisma: PrismaClient

// Configure Prisma client with increased connection pool settings
const prismaClientSingleton = () => {
  const url = process.env.DATABASE_URL || ''

  // Check if the URL already contains the connection pool parameters
  const hasConnectionLimit = url.includes('connection_limit=')
  const hasPoolTimeout = url.includes('pool_timeout=')

  // Build the parameters string based on what's missing
  let paramsToAdd = ''
  if (!hasConnectionLimit) {
    paramsToAdd += 'connection_limit=10'
  }
  if (!hasPoolTimeout) {
    if (paramsToAdd) paramsToAdd += '&'
    paramsToAdd += 'pool_timeout=20'
  }

  // Only add parameters if there are any to add
  let finalUrl = url
  if (paramsToAdd) {
    const separator = url.includes('?') ? '&' : '?'
    finalUrl = `${url}${separator}${paramsToAdd}`
  }

  return new PrismaClient({
    log: ['error', 'warn'],
    datasourceUrl: finalUrl,
  })
}

if (process.env.VERCEL_ENV === 'production') {
  prisma = prismaClientSingleton()
} else {
  if (!global.prisma) {
    global.prisma = prismaClientSingleton()
  }
  prisma = global.prisma
}

export default prisma
