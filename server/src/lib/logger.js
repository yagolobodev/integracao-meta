// Logger simples e estruturado. Nunca loga tokens/secrets em texto puro —
// use `redact()` em qualquer objeto que possa carregar credenciais antes de logar.

const SENSITIVE_KEYS = [
  'access_token',
  'accesstoken',
  'token',
  'authorization',
  'app_secret',
  'appsecret',
  'secret',
  'password',
  'capi_token',
];

function isSensitiveKey(key) {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEYS.some((sensitive) => normalized.includes(sensitive));
}

export function redact(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === 'object') {
    const clone = {};
    for (const [key, val] of Object.entries(value)) {
      clone[key] = isSensitiveKey(key) ? '[REDACTED]' : redact(val);
    }
    return clone;
  }
  return value;
}

function format(level, message, meta) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta: redact(meta) } : {}),
  };
  return entry;
}

export const logger = {
  info(message, meta) {
    console.log(JSON.stringify(format('info', message, meta)));
  },
  warn(message, meta) {
    console.warn(JSON.stringify(format('warn', message, meta)));
  },
  error(message, meta) {
    const safeMeta =
      meta instanceof Error
        ? { error: meta.message, stack: meta.stack }
        : meta;
    console.error(JSON.stringify(format('error', message, safeMeta)));
  },
};
