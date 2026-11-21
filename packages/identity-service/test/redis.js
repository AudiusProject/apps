const assert = require('assert')
const { Lock, redisClient } = require('../src/redis')

describe('test redis locks', async () => {
  beforeEach(async () => {
    await Lock.clearAllLocks('*')
  })

  afterEach(async () => {
    await Lock.clearAllLocks('*')
  })

  it('should correctly return false for `getLock` on a nonexisting lock', async () => {
    const resp = await Lock.getLock('doesnotexist')
    assert.deepStrictEqual(resp, false)
  })

  it('should correctly `setLock` and return true for `getLock` on an existing lock', async () => {
    await Lock.setLock('existinglock')
    const resp = await redisClient.get('existinglock')
    assert.deepStrictEqual(resp, '1')
  })

  it('should correctly `clearLock`', async () => {
    await Lock.setLock('existinglock')
    const respBefore = await Lock.getLock('existinglock')
    assert.deepStrictEqual(respBefore, true)

    await Lock.clearLock('existinglock')
    const respAfter = await Lock.getLock('existinglock')
    assert.deepStrictEqual(respAfter, false)
  })

  it('should correctly `clearAllLocks`', async () => {
    const keys = ['existinglock1', 'existinglock2', 'existinglock3']
    const keyPattern = 'existinglock*'

    for (const key of keys) {
      const value = await Lock.getLock(key)
      assert.deepStrictEqual(value, false)
    }

    for (const key of keys) {
      await Lock.setLock(key)
    }

    for (const key of keys) {
      const value = await Lock.getLock(key)
      assert.deepStrictEqual(value, true)
    }

    await Lock.clearAllLocks(keyPattern)

    for (const key of keys) {
      const value = await Lock.getLock(key)
      assert.deepStrictEqual(value, false)
    }
  })
})
