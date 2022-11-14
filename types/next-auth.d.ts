import 'next-auth/jwt'
import { User } from 'next-auth'

type UserId = string

declare module 'next-auth/jwt' {
  interface JWT {
    id: UserId
    mmr: number
  }
}

declare module 'next-auth' {
  interface Session {
    user: User & {
      mmr: number
      id: UserId
    }
  }
}
