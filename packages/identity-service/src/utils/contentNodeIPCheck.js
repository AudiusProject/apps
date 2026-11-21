const { logger } = require('../logging')
const { recoverWallet, signatureHasExpired } = require('./apiSigning')
const audiusLibsWrapper = require('../audiusLibsInstance')

const FIND_CONTENT_NODES_INTERVAL_MS = 10 * 60 * 1000

const KNOWN_CONTENT_NODE_IP_ADDRESSES = new Set([])
let KNOWN_CONTENT_NODE_WALLETS = new Set([])

const findContentNodes = async () => {
  const libs = await audiusLibsWrapper.getAudiusLibsAsync()
  const { ethContracts, ethWeb3Manager } = libs
  const nodes = await ethContracts.getServiceProviderList('content-node')
  const toChecksumAddress = ethWeb3Manager.getWeb3().utils.toChecksumAddress
  KNOWN_CONTENT_NODE_WALLETS = new Set(
    nodes.map((node) => toChecksumAddress(node.delegateOwnerWallet))
  )
  logger.info(
    `findContentNodes - Known wallets: ${[...KNOWN_CONTENT_NODE_WALLETS]}`
  )
}

findContentNodes()
setInterval(findContentNodes, FIND_CONTENT_NODES_INTERVAL_MS)

/**
 * Find whether a given IP belongs to a registered content node.
 * If the ip is from an already known content node IP address, return true
 * Otherwise, if the request has a signature and timestamp, recover the signing
 * wallet and determine whether it is a registered content node
 * @param {string} ip
 * @param {Request} req
 * @param {Set<string>} knownContentNodeWallets
 * @param {Set<string>} knownContentNodeIPAddresses
 */
const _isIPFromContentNode = (
  ip,
  req,
  knownContentNodeWallets,
  knownContentNodeIPAddresses
) => {
  if (knownContentNodeIPAddresses.has(ip)) {
    return true
  }

  if (!req.body || !req.body.signature || !req.body.timestamp) {
    return false
  }

  const { signature, timestamp } = req.body

  const hasExpired = signatureHasExpired(timestamp)
  if (hasExpired) {
    return false
  }

  req.logger.info(
    `isIPFromContentNode - Recovering signature: ${signature}, timestamp: ${timestamp}`
  )
  req.logger.info(
    `isIPFromContentNode - Known wallets: ${[
      ...knownContentNodeWallets
    ]}, ips: ${[...knownContentNodeIPAddresses]}`
  )
  const wallet = recoverWallet(
    {
      data: 'listen',
      timestamp
    },
    signature
  )

  req.logger.info(`isIPFromContentNode - Recovered wallet: ${wallet}`)
  if (knownContentNodeWallets.has(wallet)) {
    req.logger.info(`isIPFromContentNode - Was from content node`)
    knownContentNodeIPAddresses.add(ip)
    return true
  }
  req.logger.info(`isIPFromContentNode - Was not from content node`)
  return false
}

const isIPFromContentNode = (ip, req) => {
  return _isIPFromContentNode(
    ip,
    req,
    KNOWN_CONTENT_NODE_WALLETS,
    KNOWN_CONTENT_NODE_IP_ADDRESSES
  )
}

module.exports = {
  _isIPFromContentNode,
  isIPFromContentNode
}
