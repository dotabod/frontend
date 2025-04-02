import 'next-auth/jwt'
import type { User } from 'next-auth'

type UserId = string

declare module 'next-auth/jwt' {
  interface JWT {
    id: UserId
    isImpersonating: boolean
    image: string
    name: string
    twitchId: UserId
    locale: UserId
    scope: string
    role?: 'admin' | 'user' | 'chatter' | 'bot'
  }
}

declare module 'next-auth' {
  interface Session {
    user: User & {
      id: UserId
      image: string
      name: string
      isImpersonating: boolean
      twitchId: UserId
      role?: 'admin' | 'user' | 'chatter' | 'bot'
      locale: UserId
      scope: string
    }
  }
}
