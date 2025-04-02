export const chatVerifyScopes = [
  // Only roles that chatters who want to verify with Twitch need
  'user:read:email',
  'openid',
].join(' ') // Do not delete this declaration

export const defaultScopes = [
  'channel:bot', // Allows joining with Dotabod in the channel (new requirement by twitch)
  'channel:manage:ads', // Run ads automatically when a game ends
  'channel:manage:broadcast', // Create clips on rampage, update channel's game when playing dota, etc
  'channel:manage:moderators', // To add Dotabod as a moderator (required)
  'channel:manage:polls',
  'channel:manage:predictions',
  'channel:read:ads', // Determine if an ad is running
  'channel:read:polls',
  'channel:read:predictions',
  'channel:read:vips', // Custom commands for VIPs
  'chat:edit',
  'chat:read',
  'clips:edit', // Rampage clips, funny deaths, etc
  'moderator:read:followers', // Save total followers for the user
  'moderation:read', // Check if Dotabod is banned so we can disable it
  'openid',
  'user:read:broadcast', // We can check if twitch tooltips extension is enabled
  'user:read:chat',
  'user:read:email',
  'user:read:moderated_channels', // Check where the user is a moderator, for dotabod mod dashboard (coming soon)
  'user:write:chat',
].join(' ')

export const chatBotScopes = [
  'channel:moderate',
  'whispers:read',
  'user:bot',
  'whispers:edit',
  'user:manage:whispers',
  'moderator:read:chat_settings', // To check follower mode, emoji mode, etc
  'moderator:manage:chat_messages', // For the !plebs command
  'moderator:manage:banned_users', // For !only command
  'moderator:manage:chat_settings', // To update slow mode, follower mode, etc
  ...defaultScopes.split(' '),
].join(' ')
