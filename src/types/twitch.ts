export interface TwitchProfile {
  email?: string
  preferred_username?: string
  picture?: string
  sub?: string
}

export interface TwitchUser {
  displayName?: string
  name?: string | null
  email?: string | null
  image?: string | null
  id?: string
}
