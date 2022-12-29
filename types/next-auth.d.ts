import 'next-auth/jwt'
import { User } from 'next-auth'

type UserId = string

declare module 'next-auth/jwt' {
  interface JWT {
    id: UserId
    twitchId: UserId
  }
}

declare module 'next-auth' {
  interface Session {
    user: User & {
      id: UserId
      twitchId: UserId
    }
  }
}
