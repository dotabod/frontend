# Dotabod Frontend 👨‍💻

Welcome to the open source UI for Dotabod! This repository includes the overlay used in OBS, a dashboard to manage all settings, and the https://dotabod.com homepage.

## About Dotabod 🎮

Dotabod is a platform designed to enhance the experience of Dota 2 streamers and viewers. By providing real-time stats, twitch bets, mmr tracking, and more, Dotabod allows viewers to engage with Dota 2 streams in new and exciting ways.

## Requirements

- Node: Expected version "^18.0.0 || ^20.0.0 || >=22.0.0". If it's a fresh install then >= v22 is recommended as it has long term support.
- Yarn: `npm install -g yarn` to install yarn globally
- Bun: `npm install -g bun` to install bun globally

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
yarn
```

1. Setup your postgres database

```bash
yarn prisma db push
```

1. Start the development server

```bash
yarn dev
```

1. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

1. [Alter the frontend to use moderator scopes](https://github.com/dotabod/frontend/blob/3d884389f4b448fcf67ce5c149f265bbe9394ee4/src/lib/auth.ts#L42), then login with your chatbot

1. Undo the moderator scope changes and login with a normal twitch user that you want to stream on

## Contributing 🤝

We welcome contributions from the community! Whether you want to submit a bug report, suggest a new feature, or contribute code, we would love to hear from you. Please see our [Contributing Guidelines](CONTRIBUTING.md) for more information.

## License 📝

This project is licensed under the [MIT License](LICENSE).

![Alt](https://repobeats.axiom.co/api/embed/ea30ccaa0e412de306ca98de53ea20d18cfdfa37.svg "Repobeats analytics image")

<img alt="Vercel Logo" width="132" height="26" src="public/images/vercel.svg">
