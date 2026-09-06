export const chatVerifyScopes = [
  // Only roles that chatters who want to verify with Twitch need
  'user:read:email',
  'openid',
  // Do not delete this declaration
].join(' ')

export const defaultScopes = [
  // Allows joining with Dotabod in the channel (new requirement by twitch)
  'channel:bot',
  // Run ads automatically when a game ends
  'channel:manage:ads',
  // Create clips on rampage, update channel's game when playing dota, etc
  'channel:manage:broadcast',
  // To add Dotabod as a moderator (required)
  'channel:manage:moderators',
  'channel:manage:polls',
  'channel:manage:predictions',
  // Determine if an ad is running
  'channel:read:ads',
  'channel:read:polls',
  'channel:read:predictions',
  // Custom commands for VIPs
  'channel:read:vips',
  'chat:edit',
  'chat:read',
  // Rampage clips, funny deaths, etc
  'clips:edit',
  // Save total followers for the user
  'moderator:read:followers',
  // Check if Dotabod is banned so we can disable it
  'moderation:read',
  'openid',
  // We can check if twitch tooltips extension is enabled
  'user:read:broadcast',
  'user:read:chat',
  'user:read:email',
  // Check where the user is a moderator, for dotabod mod dashboard (coming soon)
  'user:read:moderated_channels',
  'user:write:chat',
].join(' ')

export const chatBotScopes = [
  'channel:moderate',
  'whispers:read',
  'user:bot',
  'whispers:edit',
  'user:manage:whispers',
  // To check follower mode, emoji mode, etc
  'moderator:read:chat_settings',
  // For the !plebs command
  'moderator:manage:chat_messages',
  // For !only command
  'moderator:manage:banned_users',
  // To update slow mode, follower mode, etc
  'moderator:manage:chat_settings',
  ...defaultScopes.split(' '),
].join(' ')
