const bunyan = require('bunyan')
const shortid = require('shortid')

const config = require('./config')
const logLevel = config.get('logLevel')

const levelNames = {
  10: 'TRACE',
  20: 'DEBUG',
  30: 'INFO',
  40: 'WARN',
  50: 'ERROR',
  60: 'FATAL'
}

const logStream = {
  write: (record) => {
    const logEntry = JSON.parse(record)
    logEntry.level = levelNames[logEntry.level] || logEntry.level
    process.stdout.write(JSON.stringify(logEntry) + '\n')
  }
}

const logger = bunyan.createLogger({
  name: 'audius_identity_service',
  streams: [
    {
      level: logLevel,
      stream: logStream
    }
  ]
})

logger.info('Loglevel set to:', logLevel)

const excludedRoutes = ['/health_check', '/balance_check']
function requestNotExcludedFromLogging(url) {
  return excludedRoutes.indexOf(url) === -1
}

const sensitiveQueryParamKeys = new Set([
  'email',
  'username',
  'lookupkey',
  'otp',
  'token',
  'signature',
  'encoded-data-message',
  'encoded-data-signature'
])

function sanitizeQueryParams(queryParams) {
  if (!queryParams) return undefined

  const params = new URLSearchParams(queryParams)
  const sanitizedParams = []
  params.forEach((value, key) => {
    const sanitizedValue = sensitiveQueryParamKeys.has(key.toLowerCase())
      ? '[redacted]'
      : value
    sanitizedParams.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(sanitizedValue)}`
    )
  })

  return sanitizedParams.length ? sanitizedParams.join('&') : undefined
}

function withoutEmptyFields(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  )
}

function stripQueryParams(url) {
  return typeof url === 'string' ? url.split('?')[0] : undefined
}

function getErrorLogFields(error) {
  if (typeof error === 'string') {
    return { message: error }
  }
  if (!error || typeof error !== 'object') {
    return { message: String(error) }
  }

  return withoutEmptyFields({
    name: error?.name,
    message: error?.message,
    code: error?.code,
    status: error?.response?.status,
    method: error?.config?.method,
    url: stripQueryParams(error?.config?.url)
  })
}

function loggingMiddleware(req, res, next) {
  const providedRequestID = req.header('X-Request-ID')
  const requestID = providedRequestID || shortid.generate()

  const urlParts = req.url.split('?')
  req.startTime = process.hrtime()
  req.logger = logger.child({
    requestID,
    requestMethod: req.method,
    requestHostname: req.hostname,
    requestUrl: urlParts[0],
    requestQueryParams:
      urlParts.length > 1 ? sanitizeQueryParams(urlParts[1]) : undefined,
    requestIP: req.ip,
    requestXForwardedFor: req.headers['x-forwarded-for']
  })
  if (requestNotExcludedFromLogging(req.originalUrl)) {
    req.logger.debug('Begin processing request')
  }
  next()
}

module.exports = {
  getErrorLogFields,
  logger,
  loggingMiddleware,
  requestNotExcludedFromLogging,
  sanitizeQueryParams
}
