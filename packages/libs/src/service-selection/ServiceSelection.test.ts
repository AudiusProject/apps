import assert from 'assert'

import type { AxiosResponse } from 'axios'
import nock from 'nock'

import { Utils } from '../utils'

import { ServiceSelection } from './ServiceSelection'

describe('ServiceSelection', () => {
  it('prefers a healthy service', async () => {
    const good = 'https://good.audius.co'
    nock(good).get('/health_check').reply(200)

    const bad = 'https://bad.audius.co'
    nock(bad).get('/health_check').reply(400)

    const getServices = async () => [good, bad] as string[]

    const s = new ServiceSelection({
      getServices
    })
    const service = await s.select()
    assert.strictEqual(service, good)
  })

  it('prefers a faster service', async () => {
    const fast = 'https://fast.audius.co'
    nock(fast).get('/health_check').reply(200)

    const slow = 'https://slow.audius.co'
    nock(slow).get('/health_check').delay(200).reply(400)

    const s = new ServiceSelection({
      getServices: async () => [fast, slow]
    })
    const service = await s.select()
    assert.strictEqual(service, fast)
  })

  it('prefers a slower healthy service', async () => {
    const fast = 'https://fast.audius.co'
    nock(fast).get('/health_check').reply(400)

    const slow = 'https://slow.audius.co'
    nock(slow).get('/health_check').delay(200).reply(200)

    const s = new ServiceSelection({
      getServices: async () => [fast, slow]
    })
    const service = await s.select()
    assert.strictEqual(service, slow)
    assert.deepStrictEqual(s.unhealthy, new Set([fast]))
  })

  it('should find the needle in the haystack', async () => {
    const needle = 'https://needle.audius.co'
    nock(needle).get('/health_check').reply(200)
    const haystack = Array.from(
      { length: 20 },
      (_, i) => `https://${i}.audius.co`
    )
    haystack.forEach((hay) => {
      nock(hay).get('/health_check').reply(400)
    })

    const s = new ServiceSelection({
      getServices: async () => [...haystack, needle],
      maxConcurrentRequests: 2,
      requestTimeout: 100
    })
    const service = await s.select()
    assert.strictEqual(service, needle)
  })

  it('should pick null if there is no healthy service', async () => {
    const bad1 = 'https://bad1.audius.co'
    nock(bad1).get('/health_check').reply(400)

    const bad2 = 'https://bad2.audius.co'
    nock(bad2).get('/health_check').reply(400)

    const s = new ServiceSelection({
      getServices: async () => [bad1, bad2],
      requestTimeout: 100
    })
    const service = await s.select()
    assert.strictEqual(service, null)
  })

  it('respects a whitelist', async () => {
    const fast = 'https://fast.audius.co'
    nock(fast).get('/health_check').reply(200)

    const slow = 'https://slow.audius.co'
    nock(slow).get('/health_check').delay(200).reply(200)

    const s = new ServiceSelection({
      getServices: async () => [fast, slow],
      whitelist: new Set([slow])
    })
    const service = await s.select()
    assert.strictEqual(service, slow)
  })

  it('respects a blacklist', async () => {
    const fast = 'https://fast.audius.co'
    nock(fast).get('/health_check').reply(200)

    const slow = 'https://slow.audius.co'
    nock(slow).get('/health_check').delay(200).reply(200)

    const s = new ServiceSelection({
      getServices: async () => [fast, slow],
      blacklist: new Set([fast])
    })
    const service = await s.select()
    assert.strictEqual(service, slow)
  })

  it('will recheck unhealthy ones', async () => {
    const atFirstHealthy = 'https://atFirstHealthy.audius.co'
    nock(atFirstHealthy).get('/health_check').reply(200)
    nock(atFirstHealthy).get('/health_check').reply(400)

    const atFirstUnhealthy = 'https://atFirstUnhealthy.audius.co'
    nock(atFirstUnhealthy).get('/health_check').reply(400)
    nock(atFirstUnhealthy).get('/health_check').reply(200)

    const s = new ServiceSelection({
      getServices: async () => [atFirstHealthy, atFirstUnhealthy],
      unhealthyTTL: 0
    })
    const firstService = await s.select()
    assert.strictEqual(firstService, atFirstHealthy)

    await Utils.wait(0)
    const secondService = await s.select()
    assert.strictEqual(secondService, atFirstUnhealthy)
  })
})

describe('ServiceSelection withBackupCriteria', () => {
  class ServiceSelectionWithBackupCriteria extends ServiceSelection {
    override isHealthy(
      response: AxiosResponse,
      urlMap: Record<string, string>
    ) {
      if (response.status === 200) {
        if (response.data.behind) {
          const service = urlMap[response.config.url ?? '']
          if (service) {
            this.addBackup(service, response.data)
            return false
          } else {
            return true
          }
        }
        return true
      }
      return false
    }
  }

  it('adds backups', async () => {
    const behind1 = 'https://behind1.audius.co'
    nock(behind1).get('/health_check').reply(200, {
      behind: true
    })

    const behind2 = 'https://behind2.audius.co'
    nock(behind2).get('/health_check').reply(200, {
      behind: true
    })

    const ok = 'https://ok.audius.co'
    nock(ok).get('/health_check').delay(100).reply(200, {
      behind: false
    })

    const s = new ServiceSelectionWithBackupCriteria({
      getServices: async () => [behind1, behind2, ok]
    })
    const service = await s.select()
    assert.strictEqual(service, ok)
    assert.deepStrictEqual(s.backups, {
      [behind1]: { behind: true },
      [behind2]: { behind: true }
    })
  })

  it('should use a backup if there is no better option', async () => {
    const needle = 'https://needle.audius.co'
    nock(needle).get('/health_check').reply(200, {
      behind: true
    })
    const haystack = Array.from(
      { length: 20 },
      (_, i) => `https://${i}.audius.co`
    )
    haystack.forEach((hay) => {
      nock(hay).get('/health_check').reply(400)
    })

    const s = new ServiceSelectionWithBackupCriteria({
      getServices: async () => [...haystack, needle],
      maxConcurrentRequests: 2,
      requestTimeout: 100
    })
    const service = await s.select()
    assert.strictEqual(service, needle)
    assert.strictEqual(s.getTotalAttempts(), 21)
  })

  it('should skip over a backup if a better service can be found', async () => {
    const needle = 'https://needle.audius.co'
    nock(needle).get('/health_check').reply(200)
    const behind = 'https://behind.audius.co'
    nock(behind).get('/health_check').reply(200, {
      behind: true
    })
    const haystack = Array.from(
      { length: 20 },
      (_, i) => `https://${i}.audius.co`
    )
    haystack.forEach((hay) => {
      nock(hay).get('/health_check').reply(400)
    })

    const s = new ServiceSelectionWithBackupCriteria({
      getServices: async () => [behind, ...haystack, needle],
      maxConcurrentRequests: 2,
      requestTimeout: 100
    })
    const service = await s.select()
    assert.strictEqual(service, needle)
  })
})

describe('ServiceSelection withShortCircuit', () => {
  const shortcircuit = 'https://shortcircuit.audius.co'
  class ServiceSelectionWithShortCircuit extends ServiceSelection {
    override async shortcircuit() {
      return shortcircuit
    }
  }

  it('uses a short circuit', async () => {
    const other = 'https://other.audius.co'
    nock(other).get('/health_check').reply(200, {
      behind: true
    })

    const s = new ServiceSelectionWithShortCircuit({
      getServices: async () => [other]
    })
    const service = await s.select()
    assert.strictEqual(service, shortcircuit)
  })

  it('does not use a short circuit when a blacklist is present', async () => {
    const other = 'https://other.audius.co'
    nock(other).get('/health_check').reply(200, {
      behind: true
    })

    const s = new ServiceSelectionWithShortCircuit({
      getServices: async () => [other],
      blacklist: new Set([shortcircuit])
    })
    const service = await s.select()
    assert.strictEqual(service, other)
  })
})

describe('ServiceSelection findAll', () => {
  it('can find all the healthy services', async () => {
    const a = 'https://a.audius.co'
    nock(a).get('/health_check').reply(200)

    const b = 'https://b.audius.co'
    nock(b).get('/health_check').reply(200)

    const c = 'https://c.audius.co'
    nock(c).get('/health_check').reply(400)

    const s = new ServiceSelection({
      getServices: async () => [a, b, c]
    })
    const all = await s.findAll()
    assert.deepStrictEqual(all, [a, b])
  })

  it('will drop slow services', async () => {
    const a = 'https://a.audius.co'
    nock(a).get('/health_check').delay(200).reply(200)

    const b = 'https://b.audius.co'
    nock(b).get('/health_check').reply(200)

    const c = 'https://c.audius.co'
    nock(c).get('/health_check').reply(200)

    const s = new ServiceSelection({
      getServices: async () => [a, b, c],
      requestTimeout: 100
    })
    const all = await s.findAll()
    assert.deepStrictEqual(all, [b, c])
  })
})
