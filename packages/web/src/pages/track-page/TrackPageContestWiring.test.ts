import { readFileSync } from 'fs'
import { resolve } from 'path'

import { describe, expect, it } from 'vitest'

/**
 * When CONTESTS is on, the track page shows `RemixContestTeaser` (linking to
 * the dedicated contest page) and the lineup defers contest remixes to that
 * page. When the flag is off, the page restores the in-line
 * `RemixContestSection` and full remix lineup blocks.
 *
 * This test asserts that both code paths' imports and the feature-flag branch
 * stay wired in TrackPage.
 */

const readSource = (relFromWebSrc: string): string => {
  const abs = resolve(__dirname, '..', '..', relFromWebSrc)
  return readFileSync(abs, 'utf8')
}

describe('TrackPage contest wiring', () => {
  const desktopSource = readSource(
    'pages/track-page/components/desktop/TrackPage.tsx'
  )
  const mobileSource = readSource(
    'pages/track-page/components/mobile/TrackPage.tsx'
  )

  it('desktop TrackPage imports RemixContestTeaser and RemixContestSection', () => {
    expect(desktopSource).toMatch(
      /import\s*\{\s*RemixContestTeaser\s*\}\s*from\s*['"][^'"]*RemixContestTeaser['"]/
    )
    expect(desktopSource).toMatch(
      /import\s*\{\s*RemixContestSection\s*\}\s*from\s*['"][^'"]*RemixContestSection['"]/
    )
  })

  it('desktop TrackPage branches on the CONTESTS feature flag', () => {
    expect(desktopSource).toMatch(/useFeatureFlag\(\s*FeatureFlags\.CONTESTS/)
    expect(desktopSource).toMatch(/isContestsEnabled\s*\?/)
    expect(desktopSource).toMatch(/<RemixContestTeaser\b/)
    expect(desktopSource).toMatch(/<RemixContestSection\b/)
  })

  it('mobile TrackPage imports RemixContestTeaser and RemixContestSection', () => {
    expect(mobileSource).toMatch(
      /import\s*\{\s*RemixContestTeaser\s*\}\s*from\s*['"][^'"]*RemixContestTeaser['"]/
    )
    expect(mobileSource).toMatch(
      /import\s*\{\s*RemixContestSection\s*\}\s*from\s*['"][^'"]*remix-contests\/RemixContestSection['"]/
    )
  })

  it('mobile TrackPage branches on the CONTESTS feature flag', () => {
    expect(mobileSource).toMatch(/useFeatureFlag\(\s*FeatureFlags\.CONTESTS/)
    expect(mobileSource).toMatch(/isContestsEnabled\s*\?/)
    expect(mobileSource).toMatch(/<RemixContestTeaser\b/)
    expect(mobileSource).toMatch(/<RemixContestSection\b/)
  })
})
