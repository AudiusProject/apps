import assert from 'assert'

import { promiseFight } from './promiseFight'

const p = async (
  id: string,
  resolveTimeout: null | number,
  rejectTimeout?: number
) =>
  await new Promise((resolve, reject) => {
    if (resolveTimeout) {
      setTimeout(() => resolve(id), resolveTimeout)
    }
    if (rejectTimeout) {
      setTimeout(() => reject(id), rejectTimeout)
    }
  })

describe('promiseFight', () => {
  it('should pick the first', async () => {
    const res = await promiseFight([p('first', 1), p('second', 100)])
    assert.strictEqual(res, 'first')
  })

  it('should pick the first of many', async () => {
    const res = await promiseFight([
      p('first', 1),
      p('second', 100),
      p('third', 101),
      p('fourth', 102),
      p('fifth', 103)
    ])
    assert.strictEqual(res, 'first')
  })

  it('should pick the first that succeeds', async () => {
    const res = await promiseFight([
      p('first', 100),
      p('second', null, 10),
      p('third', null, 20)
    ])
    assert.strictEqual(res, 'first')
  })

  it('should pick the first that succeeds and capture the failed', async () => {
    const res = await promiseFight(
      [p('first', 100), p('second', null, 10), p('third', null, 20)],
      true
    )
    assert.deepStrictEqual(res, { val: 'first', errored: ['second', 'third'] })
  })

  it('should pick the first that succeeds and capture the failed that finished', async () => {
    const res = await promiseFight(
      [
        p('first', 100),
        p('second', null, 10),
        p('third', null, 20),
        p('fourth', null, 200)
      ],
      true
    )
    assert.deepStrictEqual(res, { val: 'first', errored: ['second', 'third'] })
  })

  it('should fail if all of the promises fail', async () => {
    try {
      await promiseFight(
        [
          p('first', null, 100),
          p('second', null, 10),
          p('third', null, 20),
          p('fourth', null, 200)
        ],
        true
      )
    } catch (e) {
      assert.deepStrictEqual(e, ['first', 'second', 'third', 'fourth'])
    }
  })
})
