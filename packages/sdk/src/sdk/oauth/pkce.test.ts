import { describe, it, expect } from 'vitest'

import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState
} from './pkce'

describe('generateCodeVerifier', () => {
  it('returns a 43-character base64url string', () => {
    const verifier = generateCodeVerifier()
    expect(verifier).toHaveLength(43)
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('generates unique values', () => {
    const a = generateCodeVerifier()
    const b = generateCodeVerifier()
    expect(a).not.toBe(b)
  })
})

describe('generateCodeChallenge', () => {
  it('produces a base64url-encoded SHA-256 hash', async () => {
    const verifier = generateCodeVerifier()
    const challenge = await generateCodeChallenge(verifier)
    expect(challenge).toHaveLength(43)
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('is deterministic for the same verifier', async () => {
    const verifier = generateCodeVerifier()
    const a = await generateCodeChallenge(verifier)
    const b = await generateCodeChallenge(verifier)
    expect(a).toBe(b)
  })

  it('differs for different verifiers', async () => {
    const a = await generateCodeChallenge(generateCodeVerifier())
    const b = await generateCodeChallenge(generateCodeVerifier())
    expect(a).not.toBe(b)
  })

  it('matches the RFC 7636 Appendix B test vector', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    const challenge = await generateCodeChallenge(verifier)
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })
})

describe('generateState', () => {
  it('returns a 22-character base64url string', () => {
    const state = generateState()
    expect(state).toHaveLength(22)
    expect(state).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('generates unique values', () => {
    const a = generateState()
    const b = generateState()
    expect(a).not.toBe(b)
  })
})
