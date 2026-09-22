import { PrismaClient } from '@prisma/client'
import fs from 'node:fs/promises'
import path from 'node:path'

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? fallback : process.argv[index + 1]
}

function requireLocalDatabase() {
  const raw = process.env.DATABASE_URL
  if (!raw) throw new Error('DATABASE_URL is required')

  const database = new URL(raw)
  if (!['127.0.0.1', 'localhost'].includes(database.hostname)) {
    throw new Error(`Refusing to seed non-local database host: ${database.hostname}`)
  }
}

requireLocalDatabase()

const username = option('username', 'maxid1337')
const output = path.resolve(
  option(
    'output',
    path.join(process.env.FRONTEND_OUTPUT_DIR ?? 'artifacts/verify-dotabod', 'overlay-fixture.json'),
  ),
)
const prisma = new PrismaClient()

try {
  const user = await prisma.user.findFirst({
    select: { id: true, name: true },
    where: { name: username },
  })
  if (!user) throw new Error(`Profile fixture user not found: ${username}`)

  await prisma.subscription.create({
    data: {
      isGift: false,
      status: 'ACTIVE',
      tier: 'PRO',
      transactionType: 'LIFETIME',
      userId: user.id,
    },
  })

  await fs.mkdir(path.dirname(output), { recursive: true })
  await fs.writeFile(output, `${JSON.stringify({ userId: user.id, username: user.name }, null, 2)}\n`)
  console.log(JSON.stringify({ output, userId: user.id, username: user.name }))
} finally {
  await prisma.$disconnect()
}
