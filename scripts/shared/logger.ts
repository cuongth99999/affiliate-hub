/**
 * Minimal structured logger. No deps — keeps GitHub Actions logs clean.
 */
const COLORS = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
} as const;

type Level = 'debug' | 'info' | 'warn' | 'error' | 'success';

function ts(): string {
  return new Date().toISOString().split('T')[1]!.slice(0, 8);
}

function colorize(level: Level, text: string): string {
  if (!process.stdout.isTTY) return text;
  const map: Record<Level, keyof typeof COLORS> = {
    debug: 'gray',
    info: 'cyan',
    warn: 'yellow',
    error: 'red',
    success: 'green',
  };
  return `${COLORS[map[level]]}${text}${COLORS.reset}`;
}

function log(level: Level, scope: string, msg: string, meta?: unknown) {
  const prefix = colorize(level, `[${ts()}] [${level.toUpperCase()}] [${scope}]`);
  const tail = meta !== undefined ? ` ${JSON.stringify(meta)}` : '';
  // eslint-disable-next-line no-console
  console.log(`${prefix} ${msg}${tail}`);
}

export interface Logger {
  debug(msg: string, meta?: unknown): void;
  info(msg: string, meta?: unknown): void;
  warn(msg: string, meta?: unknown): void;
  error(msg: string, meta?: unknown): void;
  success(msg: string, meta?: unknown): void;
}

export function createLogger(scope: string): Logger {
  return {
    debug: (msg, meta) => log('debug', scope, msg, meta),
    info: (msg, meta) => log('info', scope, msg, meta),
    warn: (msg, meta) => log('warn', scope, msg, meta),
    error: (msg, meta) => log('error', scope, msg, meta),
    success: (msg, meta) => log('success', scope, msg, meta),
  };
}
