import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import our serverless api handlers directly
import resolveHandler from './api/resolve.js';
import avatarHandler from './api/avatar.js';
import webhookHandler from './api/webhook.js';

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

  // Support both GET (for webhook registration & diagnostics) and POST (for Telegram updates)
  app.all('/api/webhook', async (req, res) => {
    try {
      await webhookHandler(req as any, res as any);
    } catch (err) {
      console.error('Error in webhook handler:', err);
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
}

startServer();
