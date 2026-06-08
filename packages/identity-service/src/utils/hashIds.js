const Hashids = require('hashids/cjs')

const HASH_SALT = 'azowernasdfoia'
const MIN_LENGTH = 5
const hashids = new Hashids(HASH_SALT, MIN_LENGTH)

function encodeHashId(id) {
  return hashids.encode([id])
}

function decodeHashId(id) {
  const ids = hashids.decode(id)
  if (!ids.length) return null
  return ids[0]
}

module.exports = {
  encodeHashId,
  decodeHashId
}
