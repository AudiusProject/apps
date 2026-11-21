import assert from 'assert'

import nock from 'nock'

import { timeRequests } from './network'

const setupRequest = (
  url: string,
  delay: number,
  version: string,
  status = 200
) => {
  const req = { url }
  nock(req.url).get('/').delay(delay).reply(status, {
    data: {
      version
    }
  })
  return req
}

describe('timeRequests()', () => {
  it('sortByVersion = true', async () => {
    const requests = [
      setupRequest('https://fastest.audius.co', 50, '1.2.3'),
      setupRequest('https://fastAndAhead.audius.co', 100, '1.2.4'),
      setupRequest('https://behind.audius.co', 100, '1.2.2'),
      setupRequest('https://slow.audius.co', 500, '1.2.3'),
      setupRequest('https://error.audius.co', 500, '1.2.3', 404)
    ]

    const res = await timeRequests({
      requests,
      sortByVersion: true
    })

    assert.strictEqual(res[0]?.request.url, 'https://fastAndAhead.audius.co')
    assert.strictEqual(res[1]?.request.url, 'https://fastest.audius.co')
    assert.strictEqual(res[2]?.request.url, 'https://slow.audius.co')
    assert.strictEqual(res[3]?.request.url, 'https://behind.audius.co')
    assert.strictEqual(res[4]?.request.url, 'https://error.audius.co')
  })

  it('sortByVersion = false', async () => {
    const requests = [
      setupRequest('https://fastest.audius.co', 50, '1.2.3'),
      setupRequest('https://fastAndAhead.audius.co', 100, '1.2.4'),
      setupRequest('https://fastAndBehind.audius.co', 100, '1.2.2'),
      setupRequest('https://slow.audius.co', 500, '1.2.3'),
      setupRequest('https://slowAndError.audius.co', 500, '1.2.3', 404)
    ]

    const res = await timeRequests({
      requests,
      sortByVersion: false,
      currentVersion: '1.2.3'
    })

    assert.strictEqual(res[0]?.request.url, 'https://fastest.audius.co')
    assert.strictEqual(res[1]?.request.url, 'https://fastAndAhead.audius.co')
    assert.strictEqual(res[2]?.request.url, 'https://slow.audius.co')
    assert.strictEqual(res[3]?.request.url, 'https://fastAndBehind.audius.co')
    assert.strictEqual(res[4]?.request.url, 'https://slowAndError.audius.co')
  })

  it('respects an equivalency delta', async function () {
    // @ts-ignore annoying amount of time trying to figure out how to type this
    this.timeout(10000)
    const allResults: string[] = []
    for (let i = 0; i < 20; ++i) {
      const requests = [
        setupRequest('https://cohort1a.audius.co', 1, '1.2.3'),
        setupRequest('https://cohort1b.audius.co', 1, '1.2.3'),
        setupRequest('https://cohort1c.audius.co', 1, '1.2.3'),

        setupRequest('https://cohort2a.audius.co', 100, '1.2.3'),
        setupRequest('https://cohort2b.audius.co', 101, '1.2.3'),
        setupRequest('https://cohort2c.audius.co', 102, '1.2.3'),

        setupRequest('https://cohort3a.audius.co', 200, '1.2.3'),
        setupRequest('https://cohort3b.audius.co', 220, '1.2.3'),
        setupRequest('https://cohort3c.audius.co', 205, '1.2.3')
      ]
      const res = await timeRequests({
        requests,
        sortByVersion: true,
        equivalencyDelta: 50
      })
      allResults.push(res.map((r) => r.request.url).join(''))

      assert(res[0]?.request.url.startsWith('https://cohort1'))
      assert(res[1]?.request.url.startsWith('https://cohort1'))
      assert(res[2]?.request.url.startsWith('https://cohort1'))

      assert(res[3]?.request.url.startsWith('https://cohort2'))
      assert(res[4]?.request.url.startsWith('https://cohort2'))
      assert(res[5]?.request.url.startsWith('https://cohort2'))

      assert(res[6]?.request.url.startsWith('https://cohort3'))
      assert(res[7]?.request.url.startsWith('https://cohort3'))
      assert(res[8]?.request.url.startsWith('https://cohort3'))
    }

    assert(!allResults.every((val) => val === allResults[0]))
  })

  it('filterNonResponsive = true', async () => {
    const requests = [
      setupRequest('https://fastest.audius.co', 50, '1.2.3'),
      setupRequest('https://fast.audius.co', 100, '1.2.3'),
      setupRequest('https://fastAndBehind.audius.co', 100, '1.2.2'),
      setupRequest('https://slow.audius.co', 500, '1.2.3'),
      setupRequest('https://slowAndError.audius.co', 500, '1.2.3', 404)
    ]

    const res = await timeRequests({
      requests,
      sortByVersion: true,
      filterNonResponsive: true,
      timeout: 150
    })

    assert.strictEqual(res[0]?.request.url, 'https://fastest.audius.co')
    assert.strictEqual(res[1]?.request.url, 'https://fast.audius.co')
    assert.strictEqual(res[2]?.request.url, 'https://fastAndBehind.audius.co')
  })
})
