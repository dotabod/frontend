import * as z from 'zod'

// OAuth provider profiles are untrusted external input. Keep the Twitch-specific
// claims at this boundary rather than assuming NextAuth's generic Profile has them.
const twitchProfileSchema = z.object({
  email: z.string().optional(),
  picture: z.string().optional(),
  preferred_username: z.string().optional(),
  sub: z.string().optional(),
})

export type TwitchProfile = z.infer<typeof twitchProfileSchema>

export const parseTwitchProfile = function parseTwitchProfile(
  profile: unknown,
): TwitchProfile | undefined {
  const parsed = twitchProfileSchema.safeParse(profile)
  return parsed.success ? parsed.data : undefined
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
