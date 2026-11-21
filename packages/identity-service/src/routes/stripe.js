const {
  handleResponse,
  successResponse,
  errorResponse,
  errorResponseBadRequest
} = require('../apiHelpers')
const config = require('../config')
const axios = require('axios')
const axiosHttpAdapter = require('axios/lib/adapters/http')
const { logger } = require('../logging')
const { getIP } = require('../utils/antiAbuse')

const createAuthHeader = () => {
  const secretKey = config.get('stripeSecretKey')
  return {
    Authorization: `Basic ${Buffer.from(secretKey + ':', 'utf-8').toString(
      'base64'
    )}`
  }
}

module.exports = function (app) {
  app.post(
    '/stripe/session',
    handleResponse(async (req) => {
      const { destinationWallet, amount, destinationCurrency } = req.body

      if (!destinationWallet || !amount || !destinationCurrency) {
        return errorResponseBadRequest('Missing input param')
      }
      if (destinationCurrency !== 'sol' && destinationCurrency !== 'usdc') {
        return errorResponseBadRequest(
          'Invalid destination currency: only support sol and usdc'
        )
      }

      const urlEncodedData = new URLSearchParams({
        customer_wallet_address: destinationWallet,
        'transaction_details[wallet_address]': destinationWallet,
        'transaction_details[supported_destination_networks][]': 'solana',
        'transaction_details[supported_destination_currencies][]': 'sol',
        'transaction_details[destination_network]': 'solana',
        'transaction_details[destination_currency]': destinationCurrency,
        'transaction_details[destination_exchange_amount]': amount,
        'transaction_details[lock_wallet_address]': true,
        customer_ip_address: getIP(req)
      })
      urlEncodedData.append(
        'transaction_details[supported_destination_currencies[]',
        'usdc'
      )

      try {
        const req = {
          adapter: axiosHttpAdapter,
          url: 'https://api.stripe.com/v1/crypto/onramp_sessions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...createAuthHeader()
          },
          data: urlEncodedData
        }
        const response = await axios(req)
        return successResponse(response.data)
      } catch (e) {
        logger.error('Failed to create Stripe session:', e.response.data)
        const { code, message, type } = e.response.data.error ?? {}
        return errorResponse(
          e.response.status,
          'Failed to create Stripe session',
          { code, message, type }
        )
      }
    })
  )
}
