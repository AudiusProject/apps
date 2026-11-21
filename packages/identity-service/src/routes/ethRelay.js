const {
  handleResponse,
  sendResponse,
  successResponse,
  errorResponseBadRequest,
  errorResponseServerError
} = require('../apiHelpers')
const ethTxRelay = require('../relay/ethTxRelay')
const crypto = require('crypto')

module.exports = function (app) {
  app.post('/eth_relay', async (req, res, next) => {
    const body = req.body
    if (body && body.contractAddress && body.senderAddress && body.encodedABI) {
      const reqBodySHA = crypto
        .createHash('sha256')
        .update(JSON.stringify(req.body))
        .digest('hex')
      try {
        const txProps = {
          contractAddress: body.contractAddress,
          encodedABI: body.encodedABI,
          senderAddress: body.senderAddress,
          gasLimit: body.gasLimit || null
        }
        const resp = await ethTxRelay.sendEthTransaction(
          req,
          txProps,
          reqBodySHA
        )
        return sendResponse(req, res, successResponse({ resp }))
      } catch (e) {
        req.logger.error('Error in transaction:', e.message, reqBodySHA)

        return sendResponse(
          req,
          res,
          errorResponseServerError(
            `Something caused the transaction to fail for payload ${reqBodySHA}, ${e.message}`
          )
        )
      }
    } else {
      return sendResponse(
        req,
        res,
        errorResponseServerError(
          'Missing one of the required fields: contractRegistryKey, contractAddress, senderAddress, encodedABI'
        )
      )
    }
  })

  app.get(
    '/eth_relayer',
    handleResponse(async (req, res, next) => {
      const { wallet } = req.query
      if (!wallet) return errorResponseBadRequest('Please provide a wallet')
      const selectedEthWallet = await ethTxRelay.queryEthRelayerWallet(wallet)
      return successResponse({ selectedEthWallet })
    })
  )
}
