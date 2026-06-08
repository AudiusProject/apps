import { describe, expect, it } from 'vitest'

import { getIsRedirectValid } from './utils'

const url = (s: string) => new URL(s)

describe('getIsRedirectValid', () => {
  // ── null / missing redirect URI ────────────────────────────────────────────

  it('returns false when redirectUri is null', () => {
    expect(
      getIsRedirectValid({ parsedRedirectUri: null, redirectUri: null })
    ).toBe(false)
  })

  it('returns false when parsedRedirectUri is null but redirectUri is set', () => {
    expect(
      getIsRedirectValid({
        parsedRedirectUri: null,
        redirectUri: 'not-a-valid-url'
      })
    ).toBe(false)
  })

  // ── postMessage ────────────────────────────────────────────────────────────

  it('returns true for postmessage', () => {
    expect(
      getIsRedirectValid({
        parsedRedirectUri: 'postmessage',
        redirectUri: 'postMessage'
      })
    ).toBe(true)
  })

  // ── dangerous schemes blocked ──────────────────────────────────────────────

  it('returns false for javascript: scheme', () => {
    expect(
      getIsRedirectValid({
        parsedRedirectUri: url('javascript:alert(1)'),
        redirectUri: 'javascript:alert(1)'
      })
    ).toBe(false)
  })

  it('returns false for data: scheme', () => {
    expect(
      getIsRedirectValid({
        parsedRedirectUri: url('data:text/html,<h1>hi</h1>'),
        redirectUri: 'data:text/html,<h1>hi</h1>'
      })
    ).toBe(false)
  })

  it('returns false for vbscript: scheme', () => {
    expect(
      getIsRedirectValid({
        parsedRedirectUri: url('vbscript:MsgBox(1)'),
        redirectUri: 'vbscript:MsgBox(1)'
      })
    ).toBe(false)
  })

  // ── https / http allowed ───────────────────────────────────────────────────

  it('returns true for https redirect URI', () => {
    expect(
      getIsRedirectValid({
        parsedRedirectUri: url('https://yourapp.com/callback'),
        redirectUri: 'https://yourapp.com/callback'
      })
    ).toBe(true)
  })

  it('returns true for http redirect URI', () => {
    expect(
      getIsRedirectValid({
        parsedRedirectUri: url('http://localhost:3000/callback'),
        redirectUri: 'http://localhost:3000/callback'
      })
    ).toBe(true)
  })

  // ── custom URI schemes allowed (required for native apps) ─────────────────

  it('returns true for custom URI scheme (mobile deep link)', () => {
    expect(
      getIsRedirectValid({
        parsedRedirectUri: url('myapp://oauth/callback'),
        redirectUri: 'myapp://oauth/callback'
      })
    ).toBe(true)
  })

  it('returns true for audiusupload:// scheme', () => {
    expect(
      getIsRedirectValid({
        parsedRedirectUri: url('audiusupload://oauth/callback'),
        redirectUri: 'audiusupload://oauth/callback'
      })
    ).toBe(true)
  })
})
