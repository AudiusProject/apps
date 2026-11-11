import { isStreamSignatureFresh } from './streamSignature'

const HOUR = 1000 * 60 * 60
const now = 1_800_000_000_000

const streamUrl = (timestamp: number) => {
  const data = JSON.stringify({
    cid: 'baeaaa',
    timestamp,
    trackId: 1,
    userId: 0
  })
  const params = new URLSearchParams({
    signature: JSON.stringify({ signature: '0xabc', data })
  })
  return `https://node.example.com/tracks/cidstream/baeaaa?${params}`
}

describe('isStreamSignatureFresh', () => {
  it('accepts a recently signed url', () => {
    expect(isStreamSignatureFresh(streamUrl(now - HOUR), now)).toBe(true)
  })

  it('rejects a url signed more than 12 hours ago', () => {
    expect(isStreamSignatureFresh(streamUrl(now - 13 * HOUR), now)).toBe(false)
    expect(isStreamSignatureFresh(streamUrl(now - 72 * HOUR), now)).toBe(false)
  })

  it('treats urls it cannot read as fresh', () => {
    expect(isStreamSignatureFresh('file:///tmp/track.mp3', now)).toBe(true)
    expect(
      isStreamSignatureFresh('https://node.example.com/x?signature=nope', now)
    ).toBe(true)
  })
})
