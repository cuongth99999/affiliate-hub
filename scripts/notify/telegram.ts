/**
 * Telegram Bot API client for sending automation notifications.
 *
 * Setup:
 *   1. Chat @BotFather → /newbot → note token
 *   2. /start chat with your bot
 *   3. Visit https://api.telegram.org/bot<TOKEN>/getUpdates → note chat_id
 *   4. Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in .env / GitHub Secrets
 */
import { env } from '../shared/env';
import { createLogger } from '../shared/logger';

const log = createLogger('telegram');

export interface SendOptions {
  text: string;
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  disableWebPagePreview?: boolean;
  silent?: boolean;
}

export async function sendTelegram(options: SendOptions): Promise<boolean> {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    log.warn('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set, skipping notify');
    return false;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: options.text,
        parse_mode: options.parseMode ?? 'Markdown',
        disable_web_page_preview: options.disableWebPagePreview ?? true,
        disable_notification: options.silent ?? false,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      log.error(`Telegram API ${res.status}: ${body.slice(0, 200)}`);
      return false;
    }

    log.success('Telegram notification sent');
    return true;
  } catch (err) {
    log.error('Telegram send failed', { error: (err as Error).message });
    return false;
  }
}

// CLI smoke test: pnpm notify:test
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  if (arg === 'test') {
    sendTelegram({
      text: '🤖 *Test notification* from affiliate-hub automation pipeline.\n\nIf you see this, Telegram bot is configured correctly.',
    })
      .then((ok) => process.exit(ok ? 0 : 1))
      .catch(() => process.exit(1));
  } else {
    log.error('Usage: tsx scripts/notify/telegram.ts test');
    process.exit(1);
  }
}
