import { isProduction } from '../lib/env';
import { maskPhone } from '../lib/sanitize';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

const SECRET_KEY = /pass(word)?|token|secret|authorization|api[-_]?key|credential|cookie|signature|^key$/i;
const PHONE_KEY = /phone|^from$|^to$/i;
const EMAIL_KEY = /e-?mail/i;

function maskEmail(value: string): string {
  const [local, domain] = value.split('@');
  return domain ? `${local.slice(0, 1)}***@${domain}` : '***';
}

/** Recursively redact secrets and mask personal data before anything reaches the log drain. */
export function sanitizeMeta(value: unknown, key = '', depth = 0): unknown {
  if (depth > 5) return '[Truncated]';
  if (SECRET_KEY.test(key)) return '[REDACTED]';
  if (typeof value === 'string') {
    if (PHONE_KEY.test(key)) return maskPhone(value);
    if (EMAIL_KEY.test(key)) return maskEmail(value);
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeMeta(item, key, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeMeta(v, k, depth + 1)]));
  }
  return value;
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta: sanitizeMeta(meta) } : {}),
  };
  const line = JSON.stringify(entry); // structured JSON: queryable in Vercel / Datadog / Logtail
  if (level === 'ERROR') console.error(line);
  else if (level === 'WARN') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => write('INFO', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('WARN', message, meta),
  error(message: string, error?: unknown, meta?: Record<string, unknown>) {
    const details =
      error instanceof Error
        ? { name: error.name, message: error.message, ...(isProduction() ? {} : { stack: error.stack }) }
        : error;
    write('ERROR', message, { ...meta, error: details });
  },
  debug(message: string, meta?: Record<string, unknown>) {
    if (!isProduction()) write('DEBUG', message, meta);
  },
};
