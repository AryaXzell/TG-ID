# TG ID — Advanced Telegram Identifier Resolver and Utility

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![React](https://img.shields.io/badge/React-18+-61dafb?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript)](https://www.typescript.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind--CSS-3.0-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

An elegant, secure, and fast full-stack web utility and integrated Telegram Bot designed to resolve Telegram usernames, invitation links, and public chat URLs into their respective numeric unique IDs and exhaustive metadata.

**GitHub Repository:** [github.com/aryaxzell/tg-id](https://github.com/aryaxzell/tg-id)

---

## Features

*   **High-Performance Single Resolution**: Instantly resolve any Telegram `@username`, `t.me/` link, or raw ID with a responsive input field, automatic error handling, and robust typing support.
*   **Seamless Batch Processing**: Resolve multiple identifiers simultaneously in bulk. Highly optimized for data gathering and administrative audits.
*   **Offline Directory Cache**: A secure, persistent local index database that maps resolved identities back to user profiles offline, ensuring near-instantaneous load times on secondary visits.
*   **Premium Anime Chibi Mascot**: Interactive vector-art anime chibi mascot illustrations featured inside empty states. Responsive on mouse hover to provide an engaging UX.
*   **Built-in Telegram Bot Core**: Standalone, active long-polling integration inside the backend that allows users to resolve handles directly from their Telegram app (and bypasses the Bot API's account privacy limits upon issuing `/start`).
*   **Vercel Serverless Architecture**: Fully compliant with Vercel Serverless Function requirements and typed with `@vercel/node`. Ready for instantaneous zero-config serverless deployments.

---

## Tech Stack

*   **Frontend**: React 18 (Vite-powered), TypeScript, Tailwind CSS, Lucide Icons.
*   **Animations**: Framer Motion (`motion/react`) with active `<AnimatePresence>` transitions for silky-smooth tab navigation.
*   **Backend and Serverless API**: Node.js, Express (for dev mode and local execution), `@vercel/node` Serverless handlers (for production).
*   **Storage and Session Memory**: Lightweight Web Storage (LocalStore/IndexedDB) wrapper for client history and offline directory caching.

---

## Project Structure

```bash
├── api/                   # Vercel Serverless Functions
│   ├── avatar.ts          # Secure Telegram avatar bypass-proxy handler
│   └── resolve.ts         # Main Telegram Bot API resolver endpoint
├── src/                   # Client-Side Application Code
│   ├── components/        # Extracted React components & modules
│   │   ├── BatchLookup.tsx      # Batch resolution component with vector illustration
│   │   ├── ErrorCard.tsx        # Troubleshooting & helper card
│   │   └── ReverseDirectory.tsx # Offline directory caching directory UI
│   ├── lib/               # Utility functions, API proxies, & Storage
│   ├── App.tsx            # Main App container & smooth tab navigation (Framer Motion)
│   └── main.tsx           # Client entrypoint
├── server.ts              # Express local server & active long-polling Telegram Bot daemon
├── vercel.json            # Official Vercel deployment routing specification
├── .env.example           # Secure configuration template
└── package.json           # Project manifest & dependency configuration
```

---

## Local Development Installation

Follow these steps to spin up the web client and backend service locally on your device:

### 1. Clone the Repository
```bash
git clone https://github.com/aryaxzell/tg-id.git
cd tg-id
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file at the root of the project and populate it with your Telegram Credentials:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### 4. Run the Application
Start the development server with Hot Module Replacement and activate the active Telegram Bot background client:
```bash
npm run dev
```
The application will run at **`http://localhost:3000`**.

---

## Production Deployment on Vercel

This repository is optimized for **Vercel** with official serverless configurations:

1. Connect your GitHub account to Vercel.
2. Select the **`tg-id`** repository.
3. Add the `TELEGRAM_BOT_TOKEN` environment variable under **Environment Variables** in Vercel.
4. Click **Deploy**. Vercel will build the frontend using Vite and serve the backend endpoints using its globally distributed serverless edge functions.

---

## Telegram Bot Integration and Features

If `TELEGRAM_BOT_TOKEN` is declared, the backend automatically starts a background long-polling listener allowing users to interact with your bot.

### Commands and Interactions:
*   `/start` — Registers the user and provides their metadata. Once a user starts a conversation with the bot, **their account can be successfully resolved in the Web App!** (Bypasses Telegram Bot API privacy limits).
*   `<any_handle>` — Send any username (e.g., `@durov`) or invitation link directly to the bot, and it will respond with an elegant Markdown card detailing its metadata.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Crafted by [aryaxzell](https://github.com/aryaxzell)*
