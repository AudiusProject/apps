const assert = require('assert')
const apiSigning = require('./apiSigning')
const { _isIPFromContentNode } = require('./contentNodeIPCheck')

describe('test contentNodeIPCheck', () => {
  it('returns true if already known', () => {
    const isIPFromContentNode = _isIPFromContentNode(
      '127.0.0.1',
      {
        body: {
          signature:
            '0x16092e63f925bc0bd2829348deadf4a3404cdb1067669fcad5bea391e54059285c292a8bad5360aca82abb9b72d0f513ccba48c99b6f99f4c4559cff7b0032251c',
          timestamp: '2021-03-16T07:25:10.351Z'
        }
      },
      new Set([]),
      new Set(['127.0.0.1'])
    )
    assert.strictEqual(isIPFromContentNode, true)
  })

  it('returns false if missing signature', () => {
    const isIPFromContentNode = _isIPFromContentNode(
      '127.0.0.1',
      {
        body: {
          timestamp: '2021-03-16T07:25:10.351Z'
        }
      },
      new Set([]),
      new Set([])
    )
    assert.strictEqual(isIPFromContentNode, false)
  })

  it('returns false if signature is expired', () => {
    const isIPFromContentNode = _isIPFromContentNode(
      '127.0.0.1',
      {
        body: {
          signature:
            '0x16092e63f925bc0bd2829348deadf4a3404cdb1067669fcad5bea391e54059285c292a8bad5360aca82abb9b72d0f513ccba48c99b6f99f4c4559cff7b0032251c',
          timestamp: '2021-03-01T07:25:10.351Z'
        }
      },
      new Set([]),
      new Set([])
    )
    assert.strictEqual(isIPFromContentNode, false)
  })

  it('returns true if signature produces a valid known wallet', () => {
    const { signature, timestamp } = apiSigning.generateTimestampAndSignature(
      { data: 'listen' },
      '0x76cade66d94d4bcb9352efee88854cc511cd918cb4bf29e4a5375900b5ef0e3c'
    )

    const isIPFromContentNode = _isIPFromContentNode(
      '127.0.0.1',
      {
        body: {
          signature,
          timestamp
        },
        logger: { info: console.log }
      },
      new Set(['0x209220b86C13EED39c126E1824adb7Cb5F548835']),
      new Set([])
    )
    assert.strictEqual(isIPFromContentNode, true)
  })
})
