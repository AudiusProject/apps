const assert = require('assert')

const {
  errorResponseBadRequest,
  errorResponseServerError,
  sendResponse
} = require('../src/apiHelpers')
const { getErrorLogFields, sanitizeQueryParams } = require('../src/logging')

function createLogger(events, fields = {}) {
  return {
    child(childFields) {
      return createLogger(events, { ...fields, ...childFields })
    },
    debug(...args) {
      events.push({ level: 'debug', fields, args })
    },
    error(...args) {
      events.push({ level: 'error', fields, args })
    }
  }
}

function createReq(events) {
  return {
    logger: createLogger(events),
    originalUrl: '/test',
    startTime: process.hrtime()
  }
}

function createRes() {
  return {
    body: undefined,
    statusCode: undefined,
    status(statusCode) {
      this.statusCode = statusCode
      return this
    },
    send(body) {
      this.body = body
      return this
    }
  }
}

describe('apiHelpers logging', function () {
  it('logs expected 4xx responses at debug instead of error', function () {
    const events = []
    const res = createRes()

    sendResponse(
      createReq(events),
      res,
      errorResponseBadRequest('Invalid credentials')
    )

    assert.strictEqual(res.statusCode, 400)
    assert.deepStrictEqual(res.body, { error: 'Invalid credentials' })
    assert.strictEqual(events.length, 1)
    assert.strictEqual(events[0].level, 'debug')
    assert.strictEqual(events[0].fields.statusCode, 400)
    assert.strictEqual(events[0].fields.errorMessage, 'Invalid credentials')
  })

  it('keeps 5xx responses at error', function () {
    const events = []
    const res = createRes()

    sendResponse(
      createReq(events),
      res,
      errorResponseServerError('Internal server error')
    )

    assert.strictEqual(res.statusCode, 500)
    assert.strictEqual(events.length, 1)
    assert.strictEqual(events[0].level, 'error')
    assert.strictEqual(events[0].fields.statusCode, 500)
  })
})

describe('identity-service log shaping', function () {
  it('redacts sensitive request query parameters', function () {
    assert.strictEqual(
      sanitizeQueryParams(
        'email=fb%40audius.co&otp=123456&lookupKey=abc&limit=10'
      ),
      'email=%5Bredacted%5D&otp=%5Bredacted%5D&lookupKey=%5Bredacted%5D&limit=10'
    )
  })

  it('keeps axios-style error logs compact', function () {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:80')
    error.code = 'ECONNREFUSED'
    error.config = {
      method: 'get',
      url: 'undefined/users?wallet=0xabc',
      request: { large: true }
    }
    error.response = { status: 503 }

    assert.deepStrictEqual(getErrorLogFields(error), {
      name: 'Error',
      message: 'connect ECONNREFUSED 127.0.0.1:80',
      code: 'ECONNREFUSED',
      status: 503,
      method: 'get',
      url: 'undefined/users'
    })
  })
})
