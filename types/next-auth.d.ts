import 'next-auth/jwt'
import type { User } from 'next-auth'

type UserId = string

declare module 'next-auth/jwt' {
  interface JWT {
    id: UserId
    twitchId: UserId
    locale: UserId
  }
}

declare module 'next-auth' {
  interface Session {
    user: User & {
      id: UserId
      twitchId: UserId
      locale: UserId
    }
  }
}
