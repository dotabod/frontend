import 'next-auth/jwt'
import type { User } from 'next-auth'

type UserId = string

declare module 'next-auth/jwt' {
  interface JWT {
    id: UserId
    isImpersonating: boolean
    twitchId: UserId
    locale: UserId
    scope: string
  }
}

declare module 'next-auth' {
  interface Session {
    user: User & {
      id: UserId
      isImpersonating: boolean
      twitchId: UserId
      role: UserRole
      locale: UserId
      scope: string
    }
  }
}
