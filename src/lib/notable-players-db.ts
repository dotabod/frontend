import { MongoClient, ObjectId } from 'mongodb'
import type { Collection, Document, WithId } from 'mongodb'

import { prismaMongo } from '@/lib/db'

interface NotablePlayer {
  id: string
  account_id: unknown
  addedBy: string | null
  avatar: string | null
  avatarfull: string | null
  avatarmedium: string | null
  channel: string | null
  cheese: number | null
  country_code: string | null
  createdAt: Date | null
  fantasy_role: number | null
  fh_unavailable: boolean | null
  full_history_time: string | null
  is_locked: boolean | null
  is_pro: boolean | null
  last_login: string | null
  last_match_time: string | null
  loccountrycode: string | null
  locked_until: unknown
  name: string
  personaname: string | null
  plus: boolean | null
  profileurl: string | null
  steamid: string | null
  team_id: number | null
  team_name: string | null
  team_tag: string | null
}

interface CreateNotablePlayerInput {
  account_id: number
  addedBy: string | null
  channel: string
  country_code?: string
  createdAt: Date
  name: string
}

interface UpdateNotablePlayerInput {
  account_id: number
  country_code?: string
  name: string
}

type NotablePlayerOwnership = Pick<NotablePlayer, 'addedBy' | 'country_code' | 'createdAt' | 'name'>

export interface NotablePlayersDatabase {
  create: (data: CreateNotablePlayerInput) => Promise<NotablePlayer>
  delete: (id: string) => Promise<void>
  findByAccountId: (channel: string, accountId: number) => Promise<NotablePlayer | null>
  findOwnership: (channel: string, id: string) => Promise<NotablePlayerOwnership | null>
  list: (channel: string) => Promise<NotablePlayer[]>
  update: (id: string, data: UpdateNotablePlayerInput) => Promise<NotablePlayer>
}

interface MongoNotablePlayerDocument extends Document, Partial<Omit<NotablePlayer, 'id'>> {
  account_id: unknown
  name: string
}

interface RuntimeNotablePlayersDatabaseOptions {
  cloudflare: NotablePlayersDatabase
  isCloudflareRuntime: () => boolean
  node: NotablePlayersDatabase
}

export const createRuntimeNotablePlayersDatabase = ({
  cloudflare,
  isCloudflareRuntime,
  node,
}: RuntimeNotablePlayersDatabaseOptions): NotablePlayersDatabase => {
  const current = () => (isCloudflareRuntime() ? cloudflare : node)

  return {
    create: async (data) => await current().create(data),
    delete: async (id) => {
      await current().delete(id)
    },
    findByAccountId: async (channel, accountId) =>
      await current().findByAccountId(channel, accountId),
    findOwnership: async (channel, id) => await current().findOwnership(channel, id),
    list: async (channel) => await current().list(channel),
    update: async (id, data) => await current().update(id, data),
  }
}

const nullable = <T>(value: T | null | undefined): T | null => value ?? null

const fromMongoDocument = (player: WithId<MongoNotablePlayerDocument>): NotablePlayer => ({
  account_id: player.account_id,
  addedBy: nullable(player.addedBy),
  avatar: nullable(player.avatar),
  avatarfull: nullable(player.avatarfull),
  avatarmedium: nullable(player.avatarmedium),
  channel: nullable(player.channel),
  cheese: nullable(player.cheese),
  country_code: nullable(player.country_code),
  createdAt: nullable(player.createdAt),
  fantasy_role: nullable(player.fantasy_role),
  fh_unavailable: nullable(player.fh_unavailable),
  full_history_time: nullable(player.full_history_time),
  id: player._id.toHexString(),
  is_locked: nullable(player.is_locked),
  is_pro: nullable(player.is_pro),
  last_login: nullable(player.last_login),
  last_match_time: nullable(player.last_match_time),
  loccountrycode: nullable(player.loccountrycode),
  locked_until: nullable(player.locked_until),
  name: player.name,
  personaname: nullable(player.personaname),
  plus: nullable(player.plus),
  profileurl: nullable(player.profileurl),
  steamid: nullable(player.steamid),
  team_id: nullable(player.team_id),
  team_name: nullable(player.team_name),
  team_tag: nullable(player.team_tag),
})

const withMongoCollection = async <T>(
  operation: (collection: Collection<MongoNotablePlayerDocument>) => Promise<T>,
) => {
  const url = process.env.MONGO_URL
  if (url === undefined || url.length === 0) {
    throw new Error('MONGO_URL is not set')
  }

  const client = new MongoClient(url)
  try {
    await client.connect()
    return await operation(client.db().collection<MongoNotablePlayerDocument>('notablePlayers'))
  } finally {
    await client.close()
  }
}

const cloudflareNotablePlayersDatabase: NotablePlayersDatabase = {
  create: async (data) =>
    await withMongoCollection(async (collection) => {
      const result = await collection.insertOne(data)
      return fromMongoDocument({ ...data, _id: result.insertedId })
    }),
  delete: async (id) => {
    await withMongoCollection(async (collection) => {
      const result = await collection.deleteOne({ _id: new ObjectId(id) })
      if (result.deletedCount !== 1) {
        throw new Error('Notable player not found')
      }
    })
  },
  findByAccountId: async (channel, accountId) =>
    await withMongoCollection(async (collection) => {
      const player = await collection.findOne({ account_id: accountId, channel })
      return player ? fromMongoDocument(player) : null
    }),
  findOwnership: async (channel, id) =>
    await withMongoCollection(async (collection) => {
      const player = await collection.findOne(
        { _id: new ObjectId(id), channel },
        {
          projection: {
            _id: 0,
            addedBy: 1,
            country_code: 1,
            createdAt: 1,
            name: 1,
          },
        },
      )

      if (player === null) {
        return null
      }

      return {
        addedBy: player.addedBy ?? null,
        country_code: player.country_code ?? null,
        createdAt: player.createdAt ?? null,
        name: player.name,
      }
    }),
  list: async (channel) =>
    await withMongoCollection(async (collection) => {
      const players = await collection.find({ channel }).sort({ name: 1 }).toArray()
      return players.map(fromMongoDocument)
    }),
  update: async (id, data) =>
    await withMongoCollection(async (collection) => {
      const player = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: data },
        { returnDocument: 'after' },
      )

      if (player === null) {
        throw new Error('Notable player not found')
      }

      return fromMongoDocument(player)
    }),
}

const nodeNotablePlayersDatabase: NotablePlayersDatabase = {
  create: async (data) => await prismaMongo.notablePlayers.create({ data }),
  delete: async (id) => {
    await prismaMongo.notablePlayers.delete({ where: { id } })
  },
  findByAccountId: async (channel, accountId) =>
    await prismaMongo.notablePlayers.findFirst({
      where: {
        account_id: { equals: accountId },
        channel,
      },
    }),
  findOwnership: async (channel, id) =>
    await prismaMongo.notablePlayers.findFirst({
      select: {
        addedBy: true,
        country_code: true,
        createdAt: true,
        name: true,
      },
      where: { channel, id },
    }),
  list: async (channel) =>
    await prismaMongo.notablePlayers.findMany({
      orderBy: { name: 'asc' },
      where: { channel },
    }),
  update: async (id, data) => await prismaMongo.notablePlayers.update({ data, where: { id } }),
}

const notablePlayersDatabase = createRuntimeNotablePlayersDatabase({
  cloudflare: cloudflareNotablePlayersDatabase,
  isCloudflareRuntime: () => process.env.DOTABOD_RUNTIME === 'cloudflare',
  node: nodeNotablePlayersDatabase,
})

export const createNotablePlayer = notablePlayersDatabase.create
export const deleteNotablePlayer = notablePlayersDatabase.delete
export const findNotablePlayerByAccountId = notablePlayersDatabase.findByAccountId
export const findNotablePlayerOwnership = notablePlayersDatabase.findOwnership
export const listNotablePlayers = notablePlayersDatabase.list
export const updateNotablePlayer = notablePlayersDatabase.update
