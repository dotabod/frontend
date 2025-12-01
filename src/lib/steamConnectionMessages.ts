// Shared messaging for Steam account connection throughout the app

export const STEAM_CONNECTION_MESSAGES = {
  autoConnectInfo:
    'After this first connection, all future matches and Steam accounts auto-connect - no setup needed!',
  autoConnectOffline:
    "All future matches and Steam accounts will auto-connect (even when you're not streaming). Switch Steam accounts anytime - they connect automatically!",
  mustBeStreaming: 'Your Twitch stream MUST be online to connect Steam',
  streamMustBeOnlineToConnect:
    'Steam accounts only connect when your stream is live. Start streaming first, then follow the steps below.',
  readyToConnect: "You're ready to connect your Steam account. Follow the steps below.",
  streamsOnline: 'Your stream is online!',
  autoConnectWhenYouPlay: 'Your Steam account connects automatically when you play.',
  playAnyMatch: 'Play any Dota 2 match or demo a hero',
} as const
