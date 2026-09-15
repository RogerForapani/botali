type ErrorDetails = {
  message: string
  code: string
  status: number | null
}

const NETWORK_PATTERN = /network request failed|failed to fetch|fetch failed|networkerror|java\.net|socket|offline|internet|connection/i
const TIMEOUT_PATTERN = /timeout|timed out|tempo limite/i
const AUTH_PATTERN = /jwt|token.*expired|invalid.*token|auth session missing/i
const FORBIDDEN_PATTERN = /permission denied|row-level security|rls|not allowed|forbidden/i
const TECHNICAL_PATTERN = /\b(select|insert|update|delete|postgres|postgrest|constraint|relation|schema|column|sqlstate)\b/i

export function describeAppError(error: unknown): ErrorDetails {
  if (error instanceof Error) return { message: error.message, code: readString(error, 'code'), status: readStatus(error) }
  if (typeof error === 'string') return { message: error, code: '', status: null }
  if (error && typeof error === 'object') {
    return {
      message: readString(error, 'message') || readString(error, 'details') || 'Erro desconhecido',
      code: readString(error, 'code'),
      status: readStatus(error),
    }
  }
  return { message: 'Erro desconhecido', code: '', status: null }
}

export function userMessageForError(error: unknown, fallback: string) {
  const details = describeAppError(error)
  const fingerprint = `${details.code} ${details.status ?? ''} ${details.message}`

  if (NETWORK_PATTERN.test(fingerprint)) return 'Sem conexão com o servidor. Confira sua internet e tente novamente.'
  if (TIMEOUT_PATTERN.test(fingerprint)) return 'O servidor demorou para responder. Tente novamente em instantes.'
  if (details.status === 401 || AUTH_PATTERN.test(fingerprint)) return 'Sua sessão expirou. Entre novamente para continuar.'
  if (details.status === 403 || details.code === '42501' || FORBIDDEN_PATTERN.test(fingerprint)) return 'Você não tem permissão para realizar esta ação.'
  if (details.status !== null && details.status >= 500) return 'O serviço está temporariamente indisponível. Tente novamente em instantes.'

  const message = details.message.trim()
  if (message.length >= 4 && message.length <= 180 && !TECHNICAL_PATTERN.test(message)) return message
  return fallback
}

export function diagnosticForError(context: string, error: unknown) {
  const details = describeAppError(error)
  return {
    context,
    code: details.code || undefined,
    status: details.status ?? undefined,
    message: redact(details.message).slice(0, 240),
    occurredAt: new Date().toISOString(),
  }
}

function readString(value: object, key: string) {
  const candidate = (value as Record<string, unknown>)[key]
  return typeof candidate === 'string' ? candidate : ''
}

function readStatus(value: object) {
  const candidate = (value as Record<string, unknown>).status
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : null
}

function redact(message: string) {
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
    .replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[token redacted]')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email redacted]')
    .replace(/-?\d{1,3}\.\d{4,}\s*[,;]\s*-?\d{1,3}\.\d{4,}/g, '[coordinates redacted]')
    .replace(/(https?:\/\/[^\s?]+)\?[^\s]*/gi, '$1?[query redacted]')
}
