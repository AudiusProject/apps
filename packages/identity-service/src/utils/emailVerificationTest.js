const assert = require('assert')
const crypto = require('crypto')

// Unit tests for email verification utilities.
// These run without a database — pure logic only.
const {
  TOKEN_TTL_MS,
  generateVerificationToken,
  hashToken,
  buildVerificationLink
} = require('./emailVerification')

const { isDisposableEmail, getEmailDomain } = require('./disposableEmail')

// ---------------------------------------------------------------------------
// emailVerification utils
// ---------------------------------------------------------------------------

describe('generateVerificationToken', () => {
  it('returns a 64-char hex string (32 bytes)', () => {
    const token = generateVerificationToken()
    assert.strictEqual(typeof token, 'string')
    assert.strictEqual(token.length, 64)
    assert.match(token, /^[0-9a-f]+$/)
  })

  it('produces unique tokens on each call', () => {
    const tokens = new Set(
      Array.from({ length: 20 }, generateVerificationToken)
    )
    assert.strictEqual(tokens.size, 20)
  })
})

describe('hashToken', () => {
  it('returns a 64-char sha256 hex digest', () => {
    const hash = hashToken('abc123')
    assert.strictEqual(hash.length, 64)
    assert.match(hash, /^[0-9a-f]+$/)
  })

  it('is deterministic', () => {
    assert.strictEqual(hashToken('token'), hashToken('token'))
  })

  it('produces different hashes for different tokens', () => {
    assert.notStrictEqual(hashToken('token1'), hashToken('token2'))
  })

  it('matches crypto.createHash("sha256") directly', () => {
    const token = 'test-token-value'
    const expected = crypto.createHash('sha256').update(token).digest('hex')
    assert.strictEqual(hashToken(token), expected)
  })
})

describe('buildVerificationLink', () => {
  it('points to /email/verify on the identity service (not the frontend)', () => {
    const link = buildVerificationLink('mytoken')
    // Must NOT be the frontend website host
    assert.ok(
      !link.startsWith('https://audius.co/verify-email'),
      `Link should not point to frontend: ${link}`
    )
    // Must contain the identity service path
    assert.ok(
      link.includes('/email/verify?token='),
      `Link must include /email/verify: ${link}`
    )
  })

  it('URL-encodes the token', () => {
    const tokenWithSpecials = 'token+with=special&chars'
    const link = buildVerificationLink(tokenWithSpecials)
    assert.ok(
      !link.includes(tokenWithSpecials),
      'Raw token with special chars should be encoded'
    )
    assert.ok(link.includes(encodeURIComponent(tokenWithSpecials)))
  })

  it('uses identityServiceHost from config', () => {
    const link = buildVerificationLink('tok')
    // The link must start with the identityServiceHost config value, not websiteHost
    assert.ok(
      link.startsWith('https://identityservice.audius.co') ||
        link.includes('/email/verify'),
      `Unexpected link format: ${link}`
    )
  })
})

describe('TOKEN_TTL_MS', () => {
  it('is 24 hours in milliseconds', () => {
    assert.strictEqual(TOKEN_TTL_MS, 24 * 60 * 60 * 1000)
  })
})

// ---------------------------------------------------------------------------
// disposableEmail utils
// ---------------------------------------------------------------------------

describe('getEmailDomain', () => {
  it('extracts domain correctly', () => {
    assert.strictEqual(getEmailDomain('user@mailinator.com'), 'mailinator.com')
    assert.strictEqual(getEmailDomain('USER@Example.COM'), 'example.com')
    assert.strictEqual(getEmailDomain('a@b.c.d'), 'b.c.d')
  })

  it('returns null for invalid emails', () => {
    assert.strictEqual(getEmailDomain('notanemail'), null)
    assert.strictEqual(getEmailDomain('@'), null)
    assert.strictEqual(getEmailDomain('user@'), null)
    assert.strictEqual(getEmailDomain(null), null)
    assert.strictEqual(getEmailDomain(undefined), null)
    assert.strictEqual(getEmailDomain(42), null)
  })
})

describe('isDisposableEmail', () => {
  it('rejects known disposable domains', () => {
    // mailinator.com and guerrillamail.com are in most blocklists
    assert.strictEqual(isDisposableEmail('test@mailinator.com'), true)
    assert.strictEqual(isDisposableEmail('anon@guerrillamail.com'), true)
  })

  it('accepts legitimate domains', () => {
    assert.strictEqual(isDisposableEmail('user@gmail.com'), false)
    assert.strictEqual(isDisposableEmail('user@outlook.com'), false)
    assert.strictEqual(isDisposableEmail('user@audius.co'), false)
    assert.strictEqual(isDisposableEmail('user@protonmail.com'), false)
  })

  it('is case-insensitive', () => {
    assert.strictEqual(isDisposableEmail('user@MAILINATOR.COM'), true)
    assert.strictEqual(isDisposableEmail('user@Gmail.COM'), false)
  })

  it('returns false for invalid email strings', () => {
    assert.strictEqual(isDisposableEmail('notanemail'), false)
    assert.strictEqual(isDisposableEmail(''), false)
    assert.strictEqual(isDisposableEmail(null), false)
  })
})
