import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import our serverless api handlers directly
import resolveHandler from './api/resolve.js';
import avatarHandler from './api/avatar.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies (required for /api/resolve POST)
  app.use(express.json());

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'clipboard-write=(self)');
    next();
  });

  // API health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Map API routes to Vercel handlers
  app.post('/api/resolve', async (req, res) => {
    try {
      // Adapt Express req/res to match Vercel node types if necessary, though they are compatible
      await resolveHandler(req as any, res as any);
    } catch (err) {
      console.error('Error in resolve handler:', err);
      if (!res.headersSent) {
        res.status(500).json({ ok: false, error: { code: 'TELEGRAM_ERROR', message: 'Internal server error.' } });
      }
    }
  });

  app.get('/api/avatar', async (req, res) => {
    try {
      await avatarHandler(req as any, res as any);
    } catch (err) {
      console.error('Error in avatar handler:', err);
      if (!res.headersSent) {
        res.status(500).json({ ok: false, error: { code: 'TELEGRAM_ERROR', message: 'Internal server error.' } });
      }
    }
  });

  // Set up Vite or static serving based on environment
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (Node env: ${process.env.NODE_ENV || 'development'})`);
  });

  // Start the background Telegram Bot Polling client if token is configured
  startTelegramBot();
}

async function startTelegramBot() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN is not defined in environment variables. Telegram Bot functionality is disabled.');
    return;
  }

  console.log('🤖 Telegram Bot Client Initializing (Long Polling)...');
  let offset = 0;

  // Run the polling loop indefinitely
  while (true) {
    try {
      const getUpdatesUrl = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=20`;
      const response = await fetch(getUpdatesUrl);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;

          if (update.message) {
            const chatId = update.message.chat.id;
            const text = (update.message.text || '').trim();
            const from = update.message.from;

            if (text.toLowerCase() === '/start') {
              // Welcome command greeting & self resolution info
              const welcomeMessage = `👋 *Welcome to TG ID Bot!*

I can help you resolve Telegram usernames, public group links, or channel URLs to their unique Telegram IDs and detailed metadata.

👤 *Your Details (Registered):*
• *User ID:* \`${from.id}\`
• *First Name:* \`${from.first_name || 'None'}\`
• *Username:* ${from.username ? `@${from.username}` : '`None`'}

🎉 *Good News:* Because you have started a chat with me, you (and others) can now successfully resolve your username on our Web App!

🌐 *Web App Link:*
[Open TG ID Web Utility](https://ais-pre-77qvwewsow33gkoow5a5sz-849616957889.asia-southeast1.run.app)

💬 *How to use me:*
Simply send me any username (e.g., \`@durov\`), link (e.g., \`t.me/durov\`), or numeric ID, and I will resolve it for you instantly!`;

              await sendBotMessage(botToken, chatId, welcomeMessage);
            } else if (text) {
              // Parse input and resolve
              await handleBotResolution(botToken, chatId, text);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Error in Telegram Bot polling client:', err.message || err);
      // Backoff delay on error to avoid tight error loops
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

async function sendBotMessage(token: string, chatId: number, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    console.error('Failed to send bot message:', err);
  }
}

async function handleBotResolution(token: string, chatId: number, input: string) {
  try {
    // Basic parser for incoming bot queries
    let target = input;
    if (target.startsWith('https://t.me/')) {
      target = target.replace('https://t.me/', '');
    } else if (target.startsWith('t.me/')) {
      target = target.replace('t.me/', '');
    }

    if (target.startsWith('@')) {
      target = target.substring(1);
    }

    // Prepare API chat_id query
    const apiTargetId = /^-?\d+$/.test(target) ? target : `@${target}`;

    await sendBotMessage(token, chatId, `🔍 Resolving \`${input}\`...`);

    const chatRes = await fetch(`https://api.telegram.org/bot${token}/getChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: apiTargetId }),
    });

    const chatData = await chatRes.json();

    if (chatRes.ok && chatData.ok) {
      const result = chatData.result;
      const title = result.title || [result.first_name, result.last_name].filter(Boolean).join(' ') || 'Unknown Chat';
      const type = result.type;
      const bio = result.bio || result.description || 'None';
      const username = result.username ? `@${result.username}` : 'None';

      const responseMessage = `✅ *Telegram Resolution Result*

• *Title/Name:* \`${title}\`
• *ID:* \`${result.id}\`
• *Type:* \`${type.toUpperCase()}\`
• *Username:* ${username}
• *Bio/Description:* \`${bio}\`

🌐 *Resolve on the Web:*
[Open TG ID Web Utility](https://ais-pre-77qvwewsow33gkoow5a5sz-849616957889.asia-southeast1.run.app)`;

      await sendBotMessage(token, chatId, responseMessage);
    } else {
      const desc = chatData.description || 'Unknown error';
      await sendBotMessage(
        token,
        chatId,
        `❌ *Resolution Failed*

Could not find or resolve this handle.
• *Reason:* \`${desc}\`

*Tips:* Double-check spelling. Note that personal profiles can only be resolved if that user has previously started a chat with this bot.`
      );
    }
  } catch (err: any) {
    await sendBotMessage(token, chatId, `❌ *Internal Resolution Error:* \`${err.message || err}\``);
  }
}

startServer();
