import { VercelRequest, VercelResponse } from '@vercel/node';

// Secure Telegram avatar proxy handler

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      ok: false,
      error: { code: 'UNSUPPORTED_INPUT', message: 'Only GET requests are supported.' }
    });
  }

  const { path } = req.query;

  // 2. Validate path
  if (!path || typeof path !== 'string') {
    return res.status(400).json({
      ok: false,
      error: { code: 'INVALID_INPUT', message: 'Path is missing or invalid.' }
    });
  }

  // Sanity check path to prevent directory traversal or accessing arbitrary external URLs
  // Standard Telegram paths are of form: photos/file_0.jpg, profile_photos/file_0.jpg, etc.
  const isSafePath = /^[a-zA-Z0-9_\-\/]+\.(jpg|jpeg|png)$/.test(path);
  if (!isSafePath) {
    return res.status(400).json({
      ok: false,
      error: { code: 'INVALID_INPUT', message: 'Invalid or unsafe path format.' }
    });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return res.status(500).json({
      ok: false,
      error: { code: 'BOT_NO_ACCESS', message: 'Telegram Bot is not configured on the server.' }
    });
  }

  // 3. Request file from Telegram
  const telegramFileUrl = `https://api.telegram.org/file/bot${botToken}/${path}`;

  try {
    const response = await fetch(telegramFileUrl);
    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: { code: 'TELEGRAM_ERROR', message: 'Could not fetch image from Telegram servers.' }
      });
    }

    // 4. Stream response to client with correct headers
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    // Add aggressive caching since Telegram avatars don't change frequently on the same path
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');

    // Convert response body to buffer and send
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return res.send(buffer);

  } catch (error) {
    console.error('Error proxying avatar:', error);
    return res.status(500).json({
      ok: false,
      error: { code: 'TELEGRAM_ERROR', message: 'Failed to retrieve avatar.' }
    });
  }
}
