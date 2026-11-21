const assert = require('assert')

const BN = require('bn.js')

const { wAudioFromWeiAudio } = require('./wAudio')

describe('wAudioFromWeiAudio', () => {
  it('throws if the amount is below the minimum', () => {
    const weiAudio = new BN('1')
    assert.throws(() => wAudioFromWeiAudio(weiAudio))
  })
  it('throws if the amount too precise', () => {
    const weiAudio = new BN('100000001')
    assert.throws(() => wAudioFromWeiAudio(weiAudio))
  })
  it('converts if the amount equals the minimum', () => {
    const weiAudio = new BN('10000000000')
    const wAudio = wAudioFromWeiAudio(weiAudio)
    assert.ok(wAudio.eq(new BN('1')))
  })
  it('converts if the amount is valid', () => {
    const weiAudio = new BN('10240000000000')
    const wAudio = wAudioFromWeiAudio(weiAudio)
    assert.ok(wAudio.eq(new BN('1024')))
  })
  it('converts if the amount is large and valid', () => {
    const weiAudio = new BN('49000000000000000000')
    const wAudio = wAudioFromWeiAudio(weiAudio)
    assert.ok(wAudio.eq(new BN('4900000000')))
  })
})
