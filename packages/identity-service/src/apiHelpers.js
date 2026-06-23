const { requestNotExcludedFromLogging } = require('./logging')

module.exports.handleResponse = (func) => {
  return async function (req, res, next) {
    try {
      const resp = await func(req, res, next)

      if (!isValidResponse(resp)) {
        throw new Error('Invalid response returned by function')
      }

      sendResponse(req, res, resp)
      next()
    } catch (error) {
      next(error)
    }
  }
}

const sendResponse = (module.exports.sendResponse = (req, res, resp) => {
  const endTime = process.hrtime(req.startTime)
  const duration = Math.round(endTime[0] * 1e3 + endTime[1] * 1e-6)
  let logger = req.logger.child({
    statusCode: resp.statusCode,
    duration
  })
  if (resp.statusCode === 200) {
    if (requestNotExcludedFromLogging(req.originalUrl)) {
      logger.debug('Success')
    }
  } else {
    logger = logger.child({
      errorMessage: resp.object.error
    })
    if (resp.statusCode >= 500) {
      logger.error('Error processing request:', resp.object.error)
    } else {
      logger.debug('Client error response:', resp.object.error)
    }
  }
  res.status(resp.statusCode).send(resp.object)
})

const isValidResponse = (module.exports.isValidResponse = (resp) => {
  if (!resp || !resp.statusCode || !resp.object) {
    return false
  }

  return true
})

module.exports.successResponse = (obj = {}) => {
  return {
    statusCode: 200,
    object: obj
  }
}

const errorResponse = (module.exports.errorResponse = (
  statusCode,
  message,
  extra = {}
) => {
  return {
    statusCode,
    object: { error: message, ...extra }
  }
})

module.exports.errorResponseRateLimited = (message) => {
  return errorResponse(429, message)
}

module.exports.errorResponseUnauthorized = (message) => {
  return errorResponse(401, message)
}

module.exports.errorResponseForbidden = (message) => {
  return errorResponse(403, message)
}

module.exports.errorResponseBadRequest = (message) => {
  return errorResponse(400, message)
}

module.exports.errorResponseServerError = (message, extra = {}) => {
  return errorResponse(500, message, extra)
}
