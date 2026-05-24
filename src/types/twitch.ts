export interface TwitchProfile {
  email?: string
  preferred_username?: string
  picture?: string
  sub?: string
}

export interface TwitchUser {
  // Lowercase login as returned by /helix/users (e.g. "techleed"). Chat and
  // Helix endpoints all expect this form, NOT the OIDC `preferred_username`
  // which is actually the display name.
  name?: string | null
  // Rendered display name from /helix/users; may be Unicode (kanji etc.).
  displayName?: string
  email?: string | null
  image?: string | null
  id?: string
}
