import assert from 'assert'

import { Utils } from './utils'

describe('utils', () => {
  it('should decodeMethod correctly', async () => {
    const decoded = Utils.decodeMultihash(
      'QmWAoBkJzA1Ffur3aiVPr8h5YSV5aBxRFNeZDPmB7vnBQP'
    )
    assert.strictEqual(
      decoded.digest,
      '0x74574595073a25aaac18f1089239a26f8bceaf76cc29973d2be13352d2abca4c'
    )
    assert.strictEqual(decoded.hashFn, 18)
    assert.strictEqual(decoded.size, 32)
  })

  it('should encodeMethod correctly with 0x prefix', async () => {
    const encoded = Utils.encodeMultihash(
      '0x74574595073a25aaac18f1089239a26f8bceaf76cc29973d2be13352d2abca4c'
    )
    assert.strictEqual(
      encoded,
      'QmWAoBkJzA1Ffur3aiVPr8h5YSV5aBxRFNeZDPmB7vnBQP'
    )
  })

  it('should encodeMethod correctly without 0x prefix', async () => {
    const encoded = Utils.encodeMultihash(
      '74574595073a25aaac18f1089239a26f8bceaf76cc29973d2be13352d2abca4c'
    )
    assert.strictEqual(
      encoded,
      'QmWAoBkJzA1Ffur3aiVPr8h5YSV5aBxRFNeZDPmB7vnBQP'
    )
  })
})
