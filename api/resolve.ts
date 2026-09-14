import { VercelRequest, VercelResponse } from '@vercel/node';

// Telegram resolver API handler

// In-memory rate limiting map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 30; // 30 requests per minute

  const record = rateLimitMap.get(ip);
  if (!record) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  record.count++;
  if (record.count > maxRequests) {
    return true;
  }
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Validate HTTP method
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      ok: false,
      error: { code: 'UNSUPPORTED_INPUT', message: 'Only POST requests are supported.' }
    });
  }

  // 2. Obtain client IP for rate limiting
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  if (checkRateLimit(ip)) {
    return res.status(429).json({
      ok: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again shortly.' }
    });
  }

  try {
    const { input } = req.body || {};

    // 3. Request validation
    if (!input || typeof input !== 'string') {
      return res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'Input is malformed or empty.' }
      });
    }

    const trimmedInput = input.trim();
    
    // Enforce maximum input length
    if (trimmedInput.length > 256) {
      return res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'Input is too long. Maximum allowed length is 256 characters.' }
      });
    }

    if (trimmedInput.length === 0) {
      return res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'Input cannot be empty.' }
      });
    }

    // 4. Parser logic (Deterministic mapping of inputs)
    let username: string | null = null;
    let topicId: number | null = null;
    let rawId: string | null = null;
    let isPrivateInvite = false;

    // A. Check if raw numeric ID
    const rawIdMatch = trimmedInput.match(/^(-?\d+)$/);
    if (rawIdMatch) {
      rawId = rawIdMatch[1];
    } else {
      // B. Check if username starting with @
      const usernameMatch = trimmedInput.match(/^@([a-zA-Z0-9_]{4,32})$/);
      if (usernameMatch) {
        username = usernameMatch[1];
      } else {
        // C. Parse as URL or fallback plain username
        // Strip protocols and www
        let cleaned = trimmedInput.replace(/^(https?:\/\/)?(www\.)?/, '');

        if (cleaned.startsWith('t.me/') || cleaned.startsWith('telegram.me/') || cleaned.startsWith('telegram.dog/')) {
          // Extract path
          const path = cleaned.replace(/^(t\.me|telegram\.me|telegram\.dog)\//, '');

          // Check for private invites / formats
          if (path.startsWith('joinchat/') || path.startsWith('addlist/') || path.startsWith('+')) {
            isPrivateInvite = true;
          } else if (path.startsWith('c/')) {
            // Private channel/supergroup thread link: e.g. c/123456789/4821 or c/123456789
            isPrivateInvite = true;
          } else {
            // Public username formats
            // E.g. t.me/s/username or t.me/username or t.me/username/4821
            // Let's strip the 's/' web-view prefix if present
            let pathSegments = path.split('/').filter(Boolean);
            if (pathSegments[0] === 's' && pathSegments.length > 1) {
              pathSegments.shift();
            }

            if (pathSegments.length > 0) {
              // The first segment is the username
              const prospectiveUsername = pathSegments[0];
              if (/^[a-zA-Z0-9_]{4,32}$/.test(prospectiveUsername)) {
                username = prospectiveUsername;
                if (pathSegments.length > 1) {
                  // The second segment could be a topic/message ID
                  const prospectiveTopicId = parseInt(pathSegments[1], 10);
                  if (!isNaN(prospectiveTopicId) && prospectiveTopicId > 0) {
                    topicId = prospectiveTopicId;
                  }
                }
              } else {
                return res.status(400).json({
                  ok: false,
                  error: { code: 'UNSUPPORTED_INPUT', message: 'Invalid Telegram username format in URL.' }
                });
              }
            } else {
              return res.status(400).json({
                ok: false,
                error: { code: 'UNSUPPORTED_INPUT', message: 'No Telegram username or identifier found in URL.' }
              });
            }
          }
        } else {
          // If it doesn't look like a Telegram URL, check if it's a valid plain username
          if (/^[a-zA-Z0-9_]{4,32}$/.test(trimmedInput)) {
            username = trimmedInput;
          } else {
            return res.status(400).json({
              ok: false,
              error: { code: 'UNSUPPORTED_INPUT', message: 'Input format not supported. Use @username or a supported Telegram link.' }
            });
          }
        }
      }
    }

    // Handle immediate private invite link classification
    if (isPrivateInvite) {
      return res.status(403).json({
        ok: false,
        error: { code: 'PRIVATE_CHAT', message: "This chat isn't publicly accessible, so its ID can't be checked here." }
      });
    }

    // 5. Telegram Resolver Logic
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({
        ok: false,
        error: { code: 'BOT_NO_ACCESS', message: 'Telegram Bot is not configured on the server. Please define TELEGRAM_BOT_TOKEN.' }
      });
    }

    // Make request to Telegram Bot API (getChat)
    const getChatUrl = `https://api.telegram.org/bot${botToken}/getChat`;
    const targetChatId = username ? `@${username}` : rawId;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout for Telegram API

    let response;
    try {
      response = await fetch(getChatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: targetChatId }),
        signal: controller.signal
      });
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        return res.status(504).json({
          ok: false,
          error: { code: 'TIMEOUT', message: 'The request timed out. Telegram didn\'t respond in time. Please try again.' }
        });
      }
      return res.status(502).json({
        ok: false,
        error: { code: 'NETWORK_ERROR', message: 'Could not connect to the Telegram servers. Check your connection and retry.' }
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const tgData = await response.json();

    if (!response.ok || !tgData.ok) {
      const description = tgData.description || '';
      
      // Map Telegram API error strings to normalized error codes
      if (description.includes('chat not found')) {
        if (rawId) {
          return res.status(404).json({
            ok: false,
            error: { code: 'PRIVATE_CHAT', message: "This chat isn't publicly accessible, or the bot doesn't have access to it." }
          });
        }
        return res.status(404).json({
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Couldn\'t find this Telegram chat. Check the username or link and try again.' }
        });
      }

      if (description.includes('bot is not a member') || description.includes('user not found') || description.includes('not enough rights')) {
        return res.status(403).json({
          ok: false,
          error: { code: 'BOT_NO_ACCESS', message: 'The bot does not have required access or permissions to resolve this chat.' }
        });
      }

      return res.status(400).json({
        ok: false,
        error: { code: 'TELEGRAM_ERROR', message: `Telegram error: ${description || 'Unknown failure'}` }
      });
    }

    const result = tgData.result;

    // 6. Format Result Details
    const chatTitle = result.title || [result.first_name, result.last_name].filter(Boolean).join(' ') || 'Unknown Chat';
    const chatUsername = result.username || null;
    const chatType = result.type; // 'private', 'group', 'supergroup', 'channel'
    const chatBio = result.bio || result.description || null;

    // Handle avatar resolution safely
    let avatarUrl: string | null = null;
    if (result.photo && result.photo.small_file_id) {
      try {
        const getFileUrl = `https://api.telegram.org/bot${botToken}/getFile`;
        const fileRes = await fetch(getFileUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_id: result.photo.small_file_id })
        });
        if (fileRes.ok) {
          const fileData = await fileRes.json();
          if (fileData.ok && fileData.result.file_path) {
            avatarUrl = `/api/avatar?path=${encodeURIComponent(fileData.result.file_path)}`;
          }
        }
      } catch (avatarErr) {
        console.error('Non-blocking avatar resolution failed:', avatarErr);
      }
    }

    // 7. Handle topic resolution if requested and chat is a forum
    if (topicId !== null) {
      if (chatType !== 'supergroup' || !result.is_forum) {
        return res.status(400).json({
          ok: false,
          error: { code: 'UNSUPPORTED_INPUT', message: 'This chat does not support forum topics.' }
        });
      }

      // Try to scrape topic name from public web preview
      let topicName: string | null = null;
      if (chatUsername) {
        try {
          const scrapeController = new AbortController();
          const scrapeTimeoutId = setTimeout(() => scrapeController.abort(), 2000);
          const previewRes = await fetch(`https://t.me/${chatUsername}/${topicId}`, {
            signal: scrapeController.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36' }
          });
          clearTimeout(scrapeTimeoutId);

          if (previewRes.ok) {
            const html = await previewRes.text();
            const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
                                 html.match(/<meta\s+name="twitter:title"\s+content="([^"]+)"/i);
            if (ogTitleMatch && ogTitleMatch[1]) {
              const fullTitle = ogTitleMatch[1]; // e.g. "Development - Developer Hub" or "Development"
              if (chatTitle && fullTitle.endsWith(` - ${chatTitle}`)) {
                topicName = fullTitle.substring(0, fullTitle.length - ` - ${chatTitle}`.length);
              } else {
                topicName = fullTitle;
              }
            }
          }
        } catch (scrapeErr) {
          console.error('Non-blocking topic scraping failed or timed out:', scrapeErr);
        }
      }

      // Return forum_topic response schema
      return res.status(200).json({
        ok: true,
        data: {
          type: 'forum_topic',
          chat: {
            id: result.id,
            type: chatType,
            title: chatTitle,
            username: chatUsername,
            bio: chatBio
          },
          topic: {
            id: topicId,
            name: topicName || `Topic #${topicId}`
          },
          avatar: {
            available: !!avatarUrl,
            url: avatarUrl
          }
        }
      });
    }

    // Return standard chat response schema
    return res.status(200).json({
      ok: true,
      data: {
        type: 'chat',
        chat: {
          id: result.id,
          type: chatType,
          title: chatTitle,
          username: chatUsername,
          bio: chatBio
        },
        avatar: {
          available: !!avatarUrl,
          url: avatarUrl
        }
      }
    });

  } catch (err: any) {
    console.error('Server error handling resolution:', err);
    return res.status(500).json({
      ok: false,
      error: { code: 'TELEGRAM_ERROR', message: 'An unexpected internal error occurred on the server.' }
    });
  }
}
