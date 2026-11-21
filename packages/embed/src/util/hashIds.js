import Hashids from 'hashids'

import { logError } from './logError'

const HASH_SALT = 'azowernasdfoia'
const MIN_LENGTH = 5
const hashids = new Hashids(HASH_SALT, MIN_LENGTH)

export const decodeHashId = (id) => {
  try {
    const ids = hashids.decode(id)
    if (!ids.length) return null
    const num = Number(ids[0])
    if (isNaN(num)) return null
    return num
  } catch (e) {
    logError(`Failed to decode ${id}`, e)
    return null
  }
}

export function encodeHashId(id) {
  try {
    if (id === null) return null
    const encodedId = hashids.encode(id)
    return encodedId
  } catch (e) {
    logError(`Failed to encode ${id}`, e)
    return null
  }
}
