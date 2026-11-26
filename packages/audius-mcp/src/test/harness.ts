import { createHash, randomBytes } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import type { AudiusSdk } from '@audius/sdk'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { vi } from 'vitest'

import { createApp } from '../app.js'
import type { AudiusSession, AudiusUser } from '../audius/session.js'
import type { Config } from '../config.js'

export const CLIENT_REDIRECT = 'https://client.example/oauth/callback'

const user = (id: string, handle: string) => ({
  id,
  handle,
  name: handle,
  isVerified: false,
  followerCount: 1,
  followeeCount: 2,
  trackCount: 3,
  playlistCount: 4,
  albumCount: 0
})

export const track = (id: string, title: string) => ({
  id,
  title,
  user: user('artist1', 'artist'),
  genre: 'Electronic',
  duration: 180,
  playCount: 42,
  favoriteCount: 7,
  repostCount: 3,
  commentCount: 1,
  isUnlisted: false,
  isStreamGated: false,
  permalink: `/artist/${id}`
})

export const listenersResponse = (
  listeners: Array<{ id: string; handle: string; count: number }>
) => ({
  raw: {
    json: async () => ({
      data: listeners.map(({ id, handle, count }) => ({
        count,
        user: { id, handle, name: handle, is_verified: false }
      }))
    })
  }
})

export const createFakeSdk = (userId: string) => {
  const playlist = {
    id: 'pl1',
    playlistName: 'Mix',
    user: user(userId, 'me'),
    isAlbum: false,
    isPrivate: false,
    trackCount: 2,
    favoriteCount: 0,
    repostCount: 0,
    totalPlayCount: 0,
    permalink: '/me/playlist/mix',
    playlistContents: [
      { trackId: 't1', timestamp: 1, metadataTimestamp: 1 },
      { trackId: 't2', timestamp: 2, metadataTimestamp: 2 }
    ],
    tracks: [track('t1', 'One'), track('t2', 'Two')]
  }
  return {
    tracks: {
      searchTracks: vi.fn(async () => ({ data: [track('t1', 'One')] })),
      getTrendingTracks: vi.fn(async () => ({ data: [track('t2', 'Two')] })),
      getTrack: vi.fn(async () => ({ data: track('t1', 'One') })),
      favoriteTrack: vi.fn(async () => ({})),
      repostTrack: vi.fn(async () => ({})),
      updateTrack: vi.fn(async () => ({})),
      createTrack: vi.fn(async () => ({ trackId: 'new1' })),
      getTrackTopListenersRaw: vi.fn(
        async (_params: { trackId: string; limit: number; offset: number }) =>
          listenersResponse([])
      )
    },
    users: {
      searchUsers: vi.fn(async () => ({ data: [user('u9', 'someone')] })),
      getUser: vi.fn(async () => ({ data: user('u9', 'someone') })),
      getUserByHandle: vi.fn(async () => ({ data: user('u9', 'someone') })),
      getUserFavoriteTracks: vi.fn(async () => ({
        data: [{ timestamp: '2026-01-01', item: track('t1', 'One') }]
      })),
      getReposts: vi.fn(async () => ({
        data: [
          {
            timestamp: '2026-01-01',
            itemType: 'track',
            item: track('t1', 'One')
          },
          { timestamp: '2026-01-02', itemType: 'playlist', item: playlist }
        ]
      })),
      getTracksByUser: vi.fn(async () => ({ data: [track('t1', 'One')] })),
      getFollowers: vi.fn(async () => ({ data: [user('u9', 'someone')] }))
    },
    playlists: {
      searchPlaylists: vi.fn(async () => ({ data: [playlist] })),
      getPlaylist: vi.fn(async () => ({ data: [playlist] })),
      getPlaylistTracks: vi.fn(async () => ({ data: playlist.tracks })),
      createPlaylist: vi.fn(async () => ({ playlistId: 'pl2' })),
      updatePlaylist: vi.fn(async () => ({}))
    },
    uploads: {
      createAudioUpload: vi.fn(),
      createImageUpload: vi.fn()
    }
  }
}

export type FakeSdk = ReturnType<typeof createFakeSdk>

export const startTestServer = async () => {
  const server: Server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  const baseUrl = `http://localhost:${port}`
  const config: Config = {
    apiKey: 'test-api-key',
    publicUrl: baseUrl,
    port,
    environment: 'production',
    maxUploadBytes: 1024
  }

  const sessions: Array<{
    user: AudiusUser
    sdk: FakeSdk
    loggedOut: boolean
  }> = []
  let nextUser = 0
  const createSession = (): AudiusSession => {
    const index = nextUser++
    const identity: AudiusUser = {
      id: `user${index}`,
      handle: `handle${index}`,
      name: `User ${index}`
    }
    const record = {
      user: identity,
      sdk: createFakeSdk(identity.id),
      loggedOut: false
    }
    const state = `audius-state-${index}`
    return {
      sdk: record.sdk as unknown as AudiusSdk,
      beginLogin: async () => ({
        url: `https://audius.example/oauth/authorize?state=${state}`,
        state
      }),
      completeLogin: async (redirectUrl) => {
        if (new URL(redirectUrl).searchParams.get('code') !== 'good-code') {
          throw new Error('Token exchange failed.')
        }
        sessions.push(record)
        return identity
      },
      logout: async () => {
        record.loggedOut = true
      }
    }
  }

  const { app, provider, mcp, close } = createApp({ config, createSession })
  server.on('request', app)

  const stop = async () => {
    close()
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }

  return { baseUrl, provider, mcp, sessions, stop }
}

export type TestServer = Awaited<ReturnType<typeof startTestServer>>

export const registerClient = async (baseUrl: string) => {
  const response = await fetch(`${baseUrl}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Test Client',
      redirect_uris: [CLIENT_REDIRECT],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code']
    })
  })
  const body = (await response.json()) as { client_id: string }
  return body.client_id
}

export const beginAuthorization = async (baseUrl: string, clientId: string) => {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: CLIENT_REDIRECT,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: 'client-state',
    resource: `${baseUrl}/mcp`
  })
  const response = await fetch(`${baseUrl}/authorize?${query}`)
  const html = await response.text()
  const requestId = /name="request" value="([^"]+)"/.exec(html)?.[1]
  return { response, html, requestId, verifier }
}

export const submitConsent = (
  baseUrl: string,
  requestId: string,
  decision: 'approve' | 'deny'
) =>
  fetch(`${baseUrl}/auth`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ request: requestId, decision })
  })

export const exchangeToken = (
  baseUrl: string,
  params: Record<string, string>
) =>
  fetch(`${baseUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params)
  })

export type Tokens = { access_token: string; refresh_token: string }

export const signIn = async (baseUrl: string) => {
  const clientId = await registerClient(baseUrl)
  const { requestId, verifier } = await beginAuthorization(baseUrl, clientId)
  const consent = await submitConsent(baseUrl, requestId!, 'approve')
  const audiusState = new URL(
    consent.headers.get('location')!
  ).searchParams.get('state')!
  const callback = await fetch(
    `${baseUrl}/callback?code=good-code&state=${audiusState}`,
    { redirect: 'manual' }
  )
  const redirect = new URL(callback.headers.get('location')!)
  const code = redirect.searchParams.get('code')!
  const tokenResponse = await exchangeToken(baseUrl, {
    grant_type: 'authorization_code',
    client_id: clientId,
    code,
    code_verifier: verifier,
    redirect_uri: CLIENT_REDIRECT
  })
  const tokens = (await tokenResponse.json()) as Tokens
  return { clientId, tokens, redirect, tokenResponse }
}

export const connectMcpClient = async (
  baseUrl: string,
  accessToken: string
) => {
  const client = new Client({ name: 'test-client', version: '1.0.0' })
  const transport = new StreamableHTTPClientTransport(
    new URL(`${baseUrl}/mcp`),
    { requestInit: { headers: { Authorization: `Bearer ${accessToken}` } } }
  )
  await client.connect(transport)
  return { client, transport }
}
