const Web3 = require('web3')
const web3 = new Web3()

const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000

/**
 * Generate the timestamp and signature for api signing
 * @param {object} data
 * @param {string} privateKey
 */
const generateTimestampAndSignature = (data, privateKey) => {
  const timestamp = new Date().toISOString()
  const toSignObj = { ...data, timestamp }
  const toSignStr = JSON.stringify(sortKeys(toSignObj))
  const toSignHash = web3.utils.keccak256(toSignStr)
  const signedResponse = web3.eth.accounts.sign(toSignHash, privateKey)

  return { timestamp, signature: signedResponse.signature }
}

/**
 * Recover the public wallet address
 * @param {object} data obj with structure {...data, timestamp}
 * @param {string} signature signature generated with signed data
 */
const recoverWallet = (data, signature) => {
  const structuredData = JSON.stringify(sortKeys(data))
  const hashedData = web3.utils.keccak256(structuredData)
  const recoveredWallet = web3.eth.accounts.recover(hashedData, signature)

  return recoveredWallet
}

/**
 * Returns boolean indicating if provided timestamp is older than MAX_SIGNATURE_AGE
 * @param {string} signatureTimestamp unix timestamp string when signature was generated
 */
const signatureHasExpired = (signatureTimestamp) => {
  const signatureTimestampDate = new Date(signatureTimestamp)
  const currentTimestampDate = new Date()
  const signatureAge = currentTimestampDate - signatureTimestampDate

  return signatureAge >= MAX_SIGNATURE_AGE_MS
}

const sortKeys = (x) => {
  if (typeof x !== 'object' || !x) {
    return x
  }
  if (Array.isArray(x)) {
    return x.map(sortKeys)
  }
  return Object.keys(x)
    .sort()
    .reduce((o, k) => ({ ...o, [k]: sortKeys(x[k]) }), {})
}

module.exports = {
  generateTimestampAndSignature,
  recoverWallet,
  sortKeys,
  MAX_SIGNATURE_AGE_MS,
  signatureHasExpired
}
