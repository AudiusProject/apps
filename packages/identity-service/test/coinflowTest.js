const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { Keypair } = require('@solana/web3.js')
const { createPrivateKey, sign } = require('crypto')

// Load the route with isolated service boundaries so these tests do not need
// Postgres, Redis, a merchant key, or a live payment provider.
function loadModule(filename, dependencies) {
  const module = { exports: {} }
  vm.runInNewContext(
    fs.readFileSync(filename, 'utf8'),
    {
      module,
      exports: module.exports,
      require: (name) => dependencies[name] ?? require(name),
      Buffer,
      Date
    },
    { filename }
  )
  return module.exports
}

const apiHelpers = loadModule(path.join(__dirname, '../src/apiHelpers.js'), {
  './logging': { requestNotExcludedFromLogging: () => true }
})

const PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex')

describe('Coinflow session authentication', function () {
  let handler, authMiddleware, middleware, settings, calls, logs, response
  const keypair = Keypair.generate()
  const wallet = keypair.publicKey.toBase58()
  const identity = '0x1234567890123456789012345678901234567890'
  const privateKey = createPrivateKey({
    key: Buffer.concat([
      PKCS8_PREFIX,
      Buffer.from(keypair.secretKey.slice(0, 32))
    ]),
    type: 'pkcs8',
    format: 'der'
  })

  beforeEach(() => {
    calls = []
    logs = []
    settings = {
      coinflowApiKey: 'merchant-secret',
      coinflowEnvironment: 'sandbox'
    }
    response = { data: { key: 'session-secret' } }
    authMiddleware = () => {}
    const register = loadModule(
      path.join(__dirname, '../src/routes/coinflow.js'),
      {
        '../config': { get: (key) => settings[key] },
        '../authMiddleware': authMiddleware,
        '../apiHelpers': { ...apiHelpers, handleResponse: (fn) => fn },
        axios: async (request) => {
          calls.push(request)
          if (response instanceof Error) throw response
          return response
        },
        'axios/lib/adapters/http': () => {}
      }
    )
    register({
      post: (route, auth, fn) => {
        assert.strictEqual(route, '/coinflow/session-key')
        middleware = auth
        handler = fn
      }
    })
  })

  function request(overrides = {}, userWallet = identity) {
    const timestamp = Date.now()
    const environment = settings.coinflowEnvironment
    const message = `Audius Coinflow session:${identity}:${wallet}:${environment}:${timestamp}`
    return {
      body: {
        wallet,
        timestamp,
        environment,
        signature: sign(null, Buffer.from(message), privateKey).toString(
          'base64'
        ),
        ...overrides
      },
      user: { walletAddress: userWallet },
      logger: { error: (...args) => logs.push(args) }
    }
  }

  async function invoke(req = request()) {
    const headers = {}
    const result = await handler(req, {
      set: (key, value) => {
        headers[key] = value
      }
    })
    assert.strictEqual(headers['Cache-Control'], 'no-store')
    return result
  }

  it('requires identity authentication and uses the verified root wallet in the upstream request', async () => {
    assert.strictEqual(middleware, authMiddleware)
    const before = Date.now()
    const result = await invoke()
    assert.strictEqual(result.statusCode, 200)
    assert.strictEqual(result.object.key, 'session-secret')
    assert(result.object.expiresAt >= before + 30 * 60 * 1000)
    assert.strictEqual(calls.length, 1)
    assert.strictEqual(
      calls[0].url,
      'https://api-sandbox.coinflow.cash/api/auth/session-key'
    )
    assert.strictEqual(calls[0].method, 'GET')
    assert.strictEqual(calls[0].headers.Authorization, 'merchant-secret')
    assert.strictEqual(calls[0].headers['x-coinflow-auth-wallet'], wallet)
    assert.strictEqual(calls[0].headers['x-coinflow-auth-blockchain'], 'solana')
    assert.strictEqual(calls[0].timeout, 10000)
  })

  it('uses the production API only when configured for production', async () => {
    settings.coinflowEnvironment = 'prod'
    assert.strictEqual((await invoke()).statusCode, 200)
    assert.strictEqual(
      calls[0].url,
      'https://api.coinflow.cash/api/auth/session-key'
    )
  })

  it('rejects another wallet, another identity, and tampered signatures', async () => {
    for (const req of [
      request({ wallet: Keypair.generate().publicKey.toBase58() }),
      request({}, '0x9999999999999999999999999999999999999999'),
      request({ signature: Buffer.alloc(64).toString('base64') }),
      request({ wallet: 'not-a-solana-wallet' }),
      request({ signature: '' })
    ]) {
      assert.strictEqual((await invoke(req)).statusCode, 403)
    }
    assert.strictEqual(calls.length, 0)
  })

  it('rejects stale, future, missing, or wrong-environment proofs', async () => {
    for (const overrides of [
      { timestamp: Date.now() - 6 * 60 * 1000 },
      { timestamp: Date.now() + 60 * 1000 },
      { timestamp: undefined },
      { timestamp: '123' },
      { environment: 'prod' },
      { wallet: undefined },
      { signature: undefined }
    ]) {
      assert.strictEqual((await invoke(request(overrides))).statusCode, 400)
    }
    assert.strictEqual(calls.length, 0)
  })

  it('rejects changing the environment even when the new environment is configured', async () => {
    const req = request()
    settings.coinflowEnvironment = 'prod'
    req.body.environment = 'prod'
    assert.strictEqual((await invoke(req)).statusCode, 403)
    assert.strictEqual(calls.length, 0)
  })

  it('fails closed without a configured merchant key', async () => {
    settings.coinflowApiKey = ''
    assert.strictEqual((await invoke()).statusCode, 500)
    assert.strictEqual(calls.length, 0)
  })

  it('does not expose merchant credentials or upstream error bodies', async () => {
    response = new Error('merchant-secret')
    response.config = { headers: { Authorization: 'merchant-secret' } }
    response.response = { status: 401, data: 'session-secret' }
    const result = await invoke()
    assert.strictEqual(result.statusCode, 500)
    const output = JSON.stringify({ result, logs })
    assert(!output.includes('merchant-secret'))
    assert(!output.includes('session-secret'))
  })

  it('rejects malformed upstream responses', async () => {
    for (const data of [{}, { key: '' }, { key: 123 }, null]) {
      response = { data }
      assert.strictEqual((await invoke()).statusCode, 500)
    }
  })
})
