import 'next-auth/jwt'
import { User } from 'next-auth'

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    twitchId: string
  }
}

declare module 'next-auth' {
  interface Session {
    user: User & {
      id: string
      twitchId: string
    }
  }
}
