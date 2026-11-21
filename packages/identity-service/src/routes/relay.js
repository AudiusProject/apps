const crypto = require('crypto')

const {
  handleResponse,
  successResponse,
  errorResponseBadRequest,
  errorResponseForbidden,
  errorResponseServerError
} = require('../apiHelpers')
const txRelay = require('../relay/txRelay')
const captchaMiddleware = require('../captchaMiddleware')
const { detectAbuse } = require('../utils/antiAbuse')
const { getFeatureFlag, FEATURE_FLAGS } = require('../featureFlag')
const { getIP } = require('../utils/antiAbuse')
const { libs } = require('@audius/sdk-legacy/dist/libs')

module.exports = function (app) {
  app.post(
    '/relay',
    captchaMiddleware,
    handleResponse(async (req, res, next) => {
      const body = req.body
      const redis = req.app.get('redis')

      const user = req.user
      let optimizelyClient
      let detectAbuseOnRelay = false
      let blockAbuseOnRelay = false
      try {
        optimizelyClient = req.app.get('optimizelyClient')

        detectAbuseOnRelay =
          getFeatureFlag(
            optimizelyClient,
            FEATURE_FLAGS.DETECT_ABUSE_ON_RELAY
          ) && !req.isFromApp
        blockAbuseOnRelay =
          getFeatureFlag(
            optimizelyClient,
            FEATURE_FLAGS.BLOCK_ABUSE_ON_RELAY
          ) && !req.isFromApp
      } catch (error) {
        req.logger.error(
          `failed to retrieve optimizely feature flag for ${FEATURE_FLAGS.DETECT_ABUSE_ON_RELAY} or ${FEATURE_FLAGS.BLOCK_ABUSE_ON_RELAY}: ${error}`
        )
      }

      const userFlaggedAsAbusive =
        user &&
        (user.isBlockedFromRelay ||
          user.isBlockedFromNotifications ||
          user.isBlockedFromEmails)
      if (blockAbuseOnRelay && user && userFlaggedAsAbusive) {
        if (detectAbuseOnRelay) {
          const reqIP = getIP(req)
          detectAbuse(user, reqIP)
        }
      }

      let txProps
      if (
        body &&
        body.contractRegistryKey &&
        body.contractAddress &&
        body.senderAddress &&
        body.encodedABI
      ) {
        ;(async () => {
          try {
            if (!user) return

            const useProvisionalHandle = !user.handle && !user.blockchainUserId
            if (detectAbuseOnRelay && body.handle && useProvisionalHandle) {
              user.handle = body.handle
              await user.save()
              const reqIP = getIP(req)
              detectAbuse(user, reqIP, true)
            }
          } catch (e) {
            req.logger.error(
              `Error setting provisional handle for user ${user.wallet}: ${e.message}`
            )
          }
        })()

        let receipt
        const reqBodySHA = crypto
          .createHash('sha256')
          .update(JSON.stringify(req.body))
          .digest('hex')
        try {
          txProps = {
            contractRegistryKey: body.contractRegistryKey,
            contractAddress: body.contractAddress,
            nethermindContractAddress: body.nethermindContractAddress,
            encodedABI: body.encodedABI,
            nethermindEncodedABI: body.nethermindEncodedAbi,
            senderAddress: body.signer,
            gasLimit: body.gasLimit || null
          }

          if (txProps.contractRegistryKey === 'UserReplicaSetManager') {
            const decodedABI = libs.AudiusABIDecoder.decodeMethod(
              txProps.contractRegistryKey,
              txProps.encodedABI
            )
            if (decodedABI.name === 'updateReplicaSet') {
              throw new Error(
                'Cannot relay UserReplicaSetManager transactions when EntityManager is enabled'
              )
            }
          }

          if (blockAbuseOnRelay && user && user.isBlockedFromRelay) {
            const decodedABI = libs.AudiusABIDecoder.decodeMethod(
              txProps.contractRegistryKey,
              txProps.encodedABI
            )
            const args = {}
            for (const p of decodedABI.params) {
              args[p.name] = p.value
            }
            const isDeactivation =
              !user.is_deactivated &&
              decodedABI.name === 'manageEntity' &&
              args._entityType === 'User' &&
              args._action === 'Update' &&
              JSON.parse(args._metadata).data.is_deactivated
            if (!isDeactivation) {
              return errorResponseForbidden(`Forbidden ${user.appliedRules}`)
            }
          }
          receipt = await txRelay.sendTransaction(
            req,
            false, // resetNonce
            txProps,
            reqBodySHA
          )
        } catch (e) {
          if (e.message.includes('nonce')) {
            req.logger.warn(
              'Nonce got out of sync, resetting. Original error message: ',
              e.message
            )
            receipt = await txRelay.sendTransaction(
              req,
              true, // resetNonce
              txProps,
              reqBodySHA
            )
            // no need to return success response here, regular code execution will continue after catch()
          } else {
            await redis.setex(
              `failedTx:${reqBodySHA}`,
              60 * 60 * 24,
              JSON.stringify(req.body)
            )

            req.logger.error('Error in transaction:', e.message, reqBodySHA)
            return errorResponseServerError(
              `Something caused the transaction to fail for payload ${reqBodySHA}, ${e.message}`
            )
          }
        }

        if (user && detectAbuseOnRelay) {
          const reqIP = getIP(req)
          detectAbuse(user, reqIP)
        }

        return successResponse({ receipt })
      }

      return errorResponseBadRequest(
        'Missing one of the required fields: contractRegistryKey, contractAddress, senderAddress, encodedABI'
      )
    })
  )
}
