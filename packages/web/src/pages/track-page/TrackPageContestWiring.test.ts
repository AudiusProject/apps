import { readFileSync } from 'fs'
import { resolve } from 'path'

import { describe, expect, it } from 'vitest'

/**
 * Phase-5 architectural invariant: the track page must render the compact
 * `<RemixContestTeaser>` CTA instead of the old in-line `<RemixContestSection>`
 * tabbed experience. The full contest UX lives on its dedicated page at
 * `/@handle/@slug/contest`, and the teaser is the only surface the track page
 * exposes for it.
 *
 * This test locks in that wiring by reading the TrackPage source files and
 * asserting what they do (and do NOT) import. It's a cheap regression guard
 * — if someone re-adds the old section to the track page, these assertions
 * break immediately, before the change hits CI's heavier rendering tests.
 */

const readSource = (relFromWebSrc: string): string => {
  // __dirname-relative path so the test runs from any cwd.
  const abs = resolve(__dirname, '..', '..', relFromWebSrc)
  return readFileSync(abs, 'utf8')
}

describe('TrackPage contest wiring (Phase 5)', () => {
  const desktopSource = readSource(
    'pages/track-page/components/desktop/TrackPage.tsx'
  )
  const mobileSource = readSource(
    'pages/track-page/components/mobile/TrackPage.tsx'
  )

  it('desktop TrackPage imports RemixContestTeaser', () => {
    expect(desktopSource).toMatch(
      /import\s*\{\s*RemixContestTeaser\s*\}\s*from\s*['"][^'"]*RemixContestTeaser['"]/
    )
  })

  it('desktop TrackPage does NOT import the old RemixContestSection', () => {
    // The full tabbed contest experience moved to /contest. If someone
    // re-adds it to the track page, the UX regresses to the old duplicated
    // layout.
    expect(desktopSource).not.toMatch(/import\s*\{\s*RemixContestSection\s*\}/)
    expect(desktopSource).not.toMatch(/<RemixContestSection\b/)
  })

  it('desktop TrackPage renders the teaser CTA', () => {
    expect(desktopSource).toMatch(/<RemixContestTeaser\b/)
  })

  it('mobile TrackPage imports RemixContestTeaser', () => {
    expect(mobileSource).toMatch(
      /import\s*\{\s*RemixContestTeaser\s*\}\s*from\s*['"][^'"]*RemixContestTeaser['"]/
    )
  })

  it('mobile TrackPage does NOT import the old RemixContestSection', () => {
    expect(mobileSource).not.toMatch(/import\s*\{\s*RemixContestSection\s*\}/)
    expect(mobileSource).not.toMatch(/<RemixContestSection\b/)
  })

  it('mobile TrackPage renders the teaser CTA', () => {
    expect(mobileSource).toMatch(/<RemixContestTeaser\b/)
  })
})
