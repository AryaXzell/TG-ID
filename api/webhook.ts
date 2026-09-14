import { VercelRequest, VercelResponse } from '@vercel/node';

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

async function sendBotPhoto(token: string, chatId: number, fileId: string, caption: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: fileId,
        caption: caption,
        parse_mode: 'Markdown',
      }),
    });
  } catch (err) {
    console.error('Failed to send bot photo:', err);
  }
}

async function handleBotResolution(token: string, chatId: number, input: string, webAppLink: string) {
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

    await sendBotMessage(token, chatId, `Resolving \`${input}\`...`);

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

      const responseMessage = `*Telegram Resolution Result*

• *Title/Name:* \`${title}\`
• *ID:* \`${result.id}\`
• *Type:* \`${type.toUpperCase()}\`
• *Username:* ${username}
• *Bio/Description:* \`${bio}\`

*Resolve on the Web:*
[Open TG ID Web Utility](${webAppLink})`;

      if (result.photo && result.photo.big_file_id) {
        await sendBotPhoto(token, chatId, result.photo.big_file_id, responseMessage);
      } else {
        await sendBotMessage(token, chatId, responseMessage);
      }
    } else {
      const desc = chatData.description || 'Unknown error';
      await sendBotMessage(
        token,
        chatId,
        `*Resolution Failed*

Could not find or resolve this handle.
• *Reason:* \`${desc}\`

*Tips:* Double-check spelling. Note that personal profiles can only be resolved if that user has previously started a chat with this bot.`
      );
    }
  } catch (err: any) {
    await sendBotMessage(token, chatId, `*Internal Resolution Error:* \`${err.message || err}\``);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return res.status(500).json({
      ok: false,
      error: { code: 'BOT_NO_ACCESS', message: 'Telegram Bot is not configured. Please define TELEGRAM_BOT_TOKEN.' }
    });
  }

  // Get current hostname to dynamically build URLs
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
  const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
  const webAppLink = host ? `${protocol}://${host}` : 'https://ais-pre-77qvwewsow33gkoow5a5sz-849616957889.asia-southeast1.run.app';

  // GET: Setup/Diagnostic endpoint to register the webhook on Telegram
  if (req.method === 'GET') {
    if (!host) {
      return res.status(400).json({
        ok: false,
        error: { message: 'Cannot detect host name for webhook registration.' }
      });
    }

    const webhookUrl = `https://${host}/api/webhook`;

    try {
      // 1. Call Telegram setWebhook
      const setWebhookUrl = `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;
      const setRes = await fetch(setWebhookUrl);
      const setData = await setRes.json();

      // 2. Fetch current webhook info
      const getInfoUrl = `https://api.telegram.org/bot${botToken}/getWebhookInfo`;
      const infoRes = await fetch(getInfoUrl);
      const infoData = await infoRes.json();

      return res.status(200).json({
        ok: true,
        message: 'Telegram Webhook diagnostics and registration completed successfully.',
        webhook_target: webhookUrl,
        set_webhook_response: setData,
        current_webhook_info: infoData
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: { message: 'Failed to configure Telegram Webhook.', details: err.message || err }
      });
    }
  }

  // POST: Telegram Webhook update receiver
  if (req.method === 'POST') {
    try {
      const update = req.body;
      if (!update) {
        return res.status(400).json({ ok: false, error: 'Empty body' });
      }

      if (update.message) {
        const chatId = update.message.chat.id;
        const text = (update.message.text || '').trim();
        const from = update.message.from;

        if (text.toLowerCase() === '/start') {
          const welcomeMessage = `*Welcome to TG ID Bot!*

I can help you resolve Telegram usernames, public group links, or channel URLs to their unique Telegram IDs and detailed metadata.

*Your Details (Registered):*
• *User ID:* \`${from.id}\`
• *First Name:* \`${from.first_name || 'None'}\`
• *Username:* ${from.username ? `@${from.username}` : '`None`'}

*Information:* Because you have started a chat with me, you (and others) can now successfully resolve your username on our Web App!

*Web App Link:*
[Open TG ID Web Utility](${webAppLink})

*How to use me:*
Simply send me any username (e.g., \`@durov\`), link (e.g., \`t.me/durov\`), or numeric ID, and I will resolve it for you instantly!`;

          await sendBotMessage(botToken, chatId, welcomeMessage);
        } else if (text) {
          await handleBotResolution(botToken, chatId, text, webAppLink);
        }
      }

      // Always return 200 OK to Telegram so it knows we handled the update
      return res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error('Error handling Telegram Webhook POST update:', err);
      return res.status(200).json({ ok: false, error: err.message || err });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({
    ok: false,
    error: { code: 'UNSUPPORTED_METHOD', message: 'Only GET and POST methods are allowed on this endpoint.' }
  });
}
