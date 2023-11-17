import 'next-auth/jwt'
import { User as NextAuthUser } from 'next-auth'

type UserId = string

declare module 'next-auth/jwt' {
  interface JWT {
    id: UserId
    twitchId: UserId
    locale: UserId
  }
}

declare module 'next-auth' {
  interface User extends NextAuthUser {
    id: UserId
    twitchId: UserId
    locale: UserId
    youtube: string
  }
  interface Session {
    user: User & {
      youtube: string
      id: UserId
      twitchId: UserId
      locale: UserId
    }
  }
}
