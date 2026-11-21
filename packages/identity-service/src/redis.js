const Redis = require('ioredis')
const config = require('./config.js')
const redisClient = new Redis(
  config.get('redisPort'),
  config.get('redisHost'),
  { showFriendlyErrorStack: config.get('environment') !== 'production' }
)
const { logger } = require('./logging')

class Lock {
  /**
   * Set lock for a key in redis
   * @param {String} key redis key
   * @returns true if lock is set, false if lock is not set
   */
  static async setLock(key) {
    const response = await redisClient.setnx(key, 1)
    if (response) return true
    else return false
  }

  /**
   * Get if a lock exists in redis
   * @param {String} key redis key for lock
   * @returns true if lock exists, false if lock doesn't exist
   */
  static async getLock(key) {
    const response = await redisClient.get(key)
    if (response) return true
    else return false
  }

  static async clearLock(key) {
    redisClient.del(key)
  }

  /**
   * Clears all locks that match a redis key pattern
   * @param {String} keyPattern redis key for lock, must include '*' to select all records for a pattern
   */
  static async clearAllLocks(keyPattern) {
    const stream = redisClient.scanStream({
      match: keyPattern
    })
    const multi = redisClient.multi({ pipeline: true })

    return new Promise((resolve, reject) => {
      stream.on('data', (resultKeys) => {
        for (let i = 0; i < resultKeys.length; i++) {
          multi.del(resultKeys[i])
        }
      })
      stream.on('end', async () => {
        await multi.exec()
        resolve()
      })
      stream.on('error', async (e) => {
        logger.error(`Error deleting all values from Redis`, e)
        reject(e)
      })
    })
  }
}

module.exports = {
  redisClient,
  Lock
}
