const { createPublicKey, verify } = require('crypto')
const { PublicKey } = require('@solana/web3.js')
const axios = require('axios')
const axiosHttpAdapter = require('axios/lib/adapters/http')

const config = require('../config')
const authMiddleware = require('../authMiddleware')
const {
  handleResponse,
  successResponse,
  errorResponseBadRequest,
  errorResponseForbidden,
  errorResponseServerError
} = require('../apiHelpers')

const PROOF_MAX_AGE_MS = 5 * 60 * 1000
const SESSION_DURATION_MS = 30 * 60 * 1000
// ASN.1 SubjectPublicKeyInfo prefix for an Ed25519 public key.
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

module.exports = function (app) {
  app.post(
    '/coinflow/session-key',
    authMiddleware,
    handleResponse(async (req, res) => {
      res.set('Cache-Control', 'no-store')
      const { wallet, signature, timestamp, environment } = req.body
      if (
        typeof wallet !== 'string' ||
        typeof signature !== 'string' ||
        !Number.isSafeInteger(timestamp) ||
        timestamp > Date.now() + 30000 ||
        Date.now() - timestamp > PROOF_MAX_AGE_MS ||
        environment !== config.get('coinflowEnvironment')
      ) {
        return errorResponseBadRequest('Invalid Coinflow session request')
      }

      // The root wallet is derived locally and is not the public spl_wallet
      // (user bank). Require proof of ownership, bound to this identity and
      // environment, rather than trusting a caller-supplied wallet address.
      const message = `Audius Coinflow session:${req.user.walletAddress.toLowerCase()}:${wallet}:${environment}:${timestamp}`
      try {
        const publicKey = createPublicKey({
          key: Buffer.concat([
            ED25519_SPKI_PREFIX,
            new PublicKey(wallet).toBuffer()
          ]),
          format: 'der',
          type: 'spki'
        })
        const signatureBytes = Buffer.from(signature, 'base64')
        if (
          signatureBytes.length !== 64 ||
          !verify(null, Buffer.from(message), publicKey, signatureBytes)
        ) {
          return errorResponseForbidden('Invalid wallet ownership proof')
        }
      } catch {
        return errorResponseForbidden('Invalid wallet ownership proof')
      }

      const apiKey = config.get('coinflowApiKey')
      if (!apiKey) {
        return errorResponseServerError('Coinflow is not configured')
      }
      const baseUrl =
        environment === 'prod'
          ? 'https://api.coinflow.cash'
          : 'https://api-sandbox.coinflow.cash'
      const requestedAt = Date.now()
      try {
        const response = await axios({
          adapter: axiosHttpAdapter,
          method: 'GET',
          url: `${baseUrl}/api/auth/session-key`,
          timeout: 10000,
          headers: {
            Authorization: apiKey,
            'x-coinflow-auth-wallet': wallet,
            'x-coinflow-auth-blockchain': 'solana'
          }
        })
        if (typeof response.data?.key !== 'string' || !response.data.key) {
          throw new Error('Missing session key')
        }
        return successResponse({
          key: response.data.key,
          expiresAt: requestedAt + SESSION_DURATION_MS
        })
      } catch (error) {
        // Axios errors include the merchant key in their request config.
        req.logger.error(
          { status: error.response?.status },
          'Failed to create Coinflow session'
        )
        return errorResponseServerError('Could not create Coinflow session')
      }
    })
  )
}
