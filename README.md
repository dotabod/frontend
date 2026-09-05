# Dotabod Frontend 👨‍💻

Welcome to the open source UI for Dotabod! This repository includes the overlay used in OBS, a dashboard to manage all settings, and the https://dotabod.com homepage.

## About Dotabod 🎮

Dotabod is a platform designed to enhance the experience of Dota 2 streamers and viewers. By providing real-time stats, twitch bets, mmr tracking, and more, Dotabod allows viewers to engage with Dota 2 streams in new and exciting ways.

## Installation 🛠️

1. Clone the repository & copy the example environment file

```bash
git clone https://github.com/dotabod/frontend.git
cd frontend

# Fill out the values in .env with your own
cp .env.example .env
```

1. Install dependencies

```bash
pnpm install
```

1. Setup your postgres database

```bash
pnpm prisma db push
```

1. Start the development server

```bash
pnpm dev
```

1. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

1. [Alter the frontend to use moderator scopes](https://github.com/dotabod/frontend/blob/3d884389f4b448fcf67ce5c149f265bbe9394ee4/src/lib/auth.ts#L42), then login with your chatbot

1. Undo the moderator scope changes and login with a normal twitch user that you want to stream on

## Refreshing the queue blocker art 🖼️

The queue blocker draws a fake main menu over a streamer's real one, so its two
background images have to keep matching whatever Valve is currently shipping:

- `public/images/overlay/finding-match.png` — the client searching for a match
- `public/images/overlay/finding-match-old.png` — the client idle on the main menu

Both are refreshed from the Dota 2 client installed on your own machine. This is
Windows-only, and needs the client running and visible (not exclusive
fullscreen) at any 16:9 resolution:

```bash
pnpm overlay:finding-match
```

The command screenshots the client, scales the frame to 1080p, crops the fixed
840x355 region the overlay covers, and works out which of the two states the
menu is in — so **whichever state the client is in decides which file it
writes**. Sit on the main menu to refresh the idle art; press Find Match, run
the command, then cancel the queue to refresh the searching art. It never
touches matchmaking itself.

For the searching state it also paints out the client's baked-in "Finding
Match" caption, because the overlay draws that label itself in each streamer's
own language. Capture with your client set to English: the mask that erases the
caption covers the English string's footprint, and a longer translation can run
past it.

`node scripts/update-finding-match-overlay.mjs --help` covers the rest — feeding
in a screenshot you already have, keeping the full frame to debug a bad crop,
and forcing a particular state.

## Contributing 🤝

We welcome contributions from the community! Whether you want to submit a bug report, suggest a new feature, or contribute code, we would love to hear from you. Please see our [Contributing Guidelines](CONTRIBUTING.md) for more information.

## License 📝

This project is licensed under the [MIT License](LICENSE).

![Alt](https://repobeats.axiom.co/api/embed/ea30ccaa0e412de306ca98de53ea20d18cfdfa37.svg 'Repobeats analytics image')

<img alt="Vercel Logo" width="132" height="26" src="public/images/vercel.svg">
