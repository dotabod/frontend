// Shared messaging for Steam account connection throughout the app

export const STEAM_CONNECTION_MESSAGES = {
  autoConnectInfo:
    'After this first connection, every future match and Steam account auto-connects. No setup needed.',
  autoConnectOffline:
    "Every future match and Steam account auto-connects, even when you're not streaming. Switch Steam accounts anytime; they connect automatically.",
  mustBeStreaming: 'Your stream must be live for Steam to connect',
  streamMustBeOnlineToConnect:
    'Steam only connects while your stream is live. Start streaming, then follow the steps below.',
  readyToConnect: "You're ready to connect your Steam account. Follow the steps below.",
  streamsOnline: 'Your stream is live.',
  autoConnectWhenYouPlay: 'Steam connects automatically the next time you play.',
  playAnyMatch: 'Play any Dota 2 match or demo a hero',
} as const
