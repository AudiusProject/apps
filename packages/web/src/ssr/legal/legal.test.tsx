import { existsSync } from 'fs'
import path from 'path'

import { renderToStaticMarkup } from 'react-dom/server'
import type { PageContextServer } from 'vike/types'
import { describe, expect, it } from 'vitest'

import collectionRoute from '../collection/+route'
import profileRoute from '../profile/+route'
import trackRoute from '../track/+route'

import LegalPage from './+Page'
import legalRoute from './+route'
import { legalDocuments } from './documents'

const context = (urlPathname: string) => ({ urlPathname }) as PageContextServer

describe('legal SSR routes', () => {
  it.each(Object.entries(legalDocuments))(
    'renders %s as a legal document instead of a track',
    (pathname, { title, documentPath }) => {
      for (const urlPathname of [pathname, `${pathname}/`]) {
        expect(legalRoute(context(urlPathname))).toMatchObject({ match: true })
        expect(trackRoute(context(urlPathname))).toBe(false)
        expect(profileRoute(context(urlPathname))).toBe(false)
        expect(collectionRoute(context(urlPathname))).toBe(false)
      }

      const html = renderToStaticMarkup(
        <LegalPage title={title} documentUrl={documentPath} />
      )
      expect(html).toContain(`<h1>${title}</h1>`)
      expect(html).toContain(`href="${documentPath}"`)
      expect(html).toContain(`src="${documentPath}"`)
      // Use a filesystem path: Vite rewrites new URL(..., import.meta.url)
      // as an asset URL in the browser test environment.
      expect(
        existsSync(path.join(__dirname, '../../../public', documentPath))
      ).toBe(true)
    }
  )

  it('reserves the legal namespace from all music routes', () => {
    for (const pathname of [
      '/legal',
      '/legal/unknown-policy',
      '/legal/tracks',
      '/legal/playlist/policy',
      '/legal/album/policy'
    ]) {
      expect(legalRoute(context(pathname))).toBe(false)
      expect(trackRoute(context(pathname))).toBe(false)
      expect(profileRoute(context(pathname))).toBe(false)
      expect(collectionRoute(context(pathname))).toBe(false)
    }
  })

  it('preserves normal music routes', () => {
    expect(profileRoute(context('/artist'))).toMatchObject({
      match: true,
      routeParams: { handle: 'artist' }
    })
    expect(trackRoute(context('/artist/song'))).toMatchObject({
      match: true,
      routeParams: { handle: 'artist', slug: 'song' }
    })
    expect(collectionRoute(context('/artist/playlist/mix'))).toMatchObject({
      match: true,
      routeParams: { handle: 'artist', slug: 'mix' }
    })
    expect(legalRoute(context('/artist/song'))).toBe(false)
  })
})
