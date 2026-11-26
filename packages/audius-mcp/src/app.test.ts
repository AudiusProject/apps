import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  CLIENT_REDIRECT,
  beginAuthorization,
  connectMcpClient,
  exchangeToken,
  listenersResponse,
  registerClient,
  signIn,
  startTestServer,
  submitConsent,
  track,
  type TestServer,
  type Tokens,
  user
} from './test/harness.js'

const READ_ONLY_TOOLS = [
  'search_tracks',
  'search_users',
  'search_playlists',
  'get_trending_tracks',
  'get_track',
  'get_user',
  'get_playlist',
  'get_my_favorites',
  'get_my_reposts',
  'get_my_tracks',
  'get_track_play_count',
  'get_my_followers',
  'get_top_fans'
]

const WRITE_TOOLS: Record<string, boolean> = {
  create_playlist: false,
  add_track_to_playlist: false,
  remove_track_from_playlist: true,
  favorite_track: false,
  repost_track: false,
  update_track_metadata: true,
  upload_track: false
}

const textOf = (result: unknown) =>
  (result as { content: Array<{ text: string }> }).content[0]!.text

describe('audius mcp server', () => {
  let server: TestServer

  beforeEach(async () => {
    server = await startTestServer()
  })

  afterEach(async () => {
    await server.stop()
  })

  describe('discovery', () => {
    it('publishes OAuth metadata that points at this server', async () => {
      const resource = await fetch(
        `${server.baseUrl}/.well-known/oauth-protected-resource/mcp`
      ).then((r) => r.json())
      expect(resource.resource).toBe(`${server.baseUrl}/mcp`)
      expect(resource.authorization_servers).toEqual([`${server.baseUrl}/`])

      const metadata = await fetch(
        `${server.baseUrl}/.well-known/oauth-authorization-server`
      ).then((r) => r.json())
      expect(metadata.authorization_endpoint).toBe(
        `${server.baseUrl}/authorize`
      )
      expect(metadata.token_endpoint).toBe(`${server.baseUrl}/token`)
      expect(metadata.registration_endpoint).toBe(`${server.baseUrl}/register`)
      expect(metadata.code_challenge_methods_supported).toEqual(['S256'])
    })

    it('challenges unauthenticated MCP requests', async () => {
      const response = await fetch(`${server.baseUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
      })
      expect(response.status).toBe(401)
      expect(response.headers.get('www-authenticate')).toContain(
        `resource_metadata="${server.baseUrl}/.well-known/oauth-protected-resource/mcp"`
      )
    })

    it('rejects a made-up bearer token', async () => {
      const response = await fetch(`${server.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer not-a-real-token'
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
      })
      expect(response.status).toBe(401)
    })
  })

  describe('authorization', () => {
    it('shows a consent page naming the client before going to Audius', async () => {
      const clientId = await registerClient(server.baseUrl)
      const { response, html, requestId } = await beginAuthorization(
        server.baseUrl,
        clientId
      )
      expect(response.status).toBe(200)
      expect(response.headers.get('x-frame-options')).toBe('DENY')
      expect(html).toContain('Connect Test Client to Audius')
      expect(html).toContain('client.example')
      expect(requestId).toBeTruthy()
    })

    it('escapes the client name on the consent page', async () => {
      const registration = await fetch(`${server.baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: '<script>alert(1)</script>',
          redirect_uris: [CLIENT_REDIRECT],
          token_endpoint_auth_method: 'none'
        })
      }).then((r) => r.json())
      const { html } = await beginAuthorization(
        server.baseUrl,
        registration.client_id
      )
      expect(html).not.toContain('<script>alert(1)</script>')
      expect(html).toContain('&lt;script&gt;')
    })

    it('refuses a redirect URI the client did not register', async () => {
      const clientId = await registerClient(server.baseUrl)
      const query = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: 'https://attacker.example/steal',
        code_challenge: 'x'.repeat(43),
        code_challenge_method: 'S256'
      })
      const response = await fetch(`${server.baseUrl}/authorize?${query}`, {
        redirect: 'manual'
      })
      expect(response.status).toBe(400)
    })

    it('completes the full flow and issues tokens', async () => {
      const { tokens, redirect, tokenResponse } = await signIn(server.baseUrl)
      expect(redirect.origin + redirect.pathname).toBe(CLIENT_REDIRECT)
      expect(redirect.searchParams.get('state')).toBe('client-state')
      expect(tokenResponse.status).toBe(200)
      expect(tokens.access_token).toBeTruthy()
      expect(tokens.refresh_token).toBeTruthy()
    })

    it('returns access_denied to the client when the user cancels', async () => {
      const clientId = await registerClient(server.baseUrl)
      const { requestId } = await beginAuthorization(server.baseUrl, clientId)
      const response = await submitConsent(server.baseUrl, requestId!, 'deny')
      const location = new URL(response.headers.get('location')!)
      expect(location.searchParams.get('error')).toBe('access_denied')
      expect(location.searchParams.get('state')).toBe('client-state')

      const retry = await submitConsent(server.baseUrl, requestId!, 'approve')
      expect(retry.status).toBe(400)
    })

    it('returns an error to the client when Audius denies or fails', async () => {
      const clientId = await registerClient(server.baseUrl)
      const first = await beginAuthorization(server.baseUrl, clientId)
      const consent = await submitConsent(
        server.baseUrl,
        first.requestId!,
        'approve'
      )
      const state = new URL(consent.headers.get('location')!).searchParams.get(
        'state'
      )
      const denied = await fetch(
        `${server.baseUrl}/callback?error=access_denied&state=${state}`,
        { redirect: 'manual' }
      )
      expect(
        new URL(denied.headers.get('location')!).searchParams.get('error')
      ).toBe('access_denied')

      const second = await beginAuthorization(server.baseUrl, clientId)
      const consent2 = await submitConsent(
        server.baseUrl,
        second.requestId!,
        'approve'
      )
      const state2 = new URL(
        consent2.headers.get('location')!
      ).searchParams.get('state')
      const failed = await fetch(
        `${server.baseUrl}/callback?code=bad-code&state=${state2}`,
        { redirect: 'manual' }
      )
      expect(
        new URL(failed.headers.get('location')!).searchParams.get('error')
      ).toBe('server_error')
    })

    it('rejects a callback with an unknown state', async () => {
      const response = await fetch(
        `${server.baseUrl}/callback?code=good-code&state=forged`,
        { redirect: 'manual' }
      )
      expect(response.status).toBe(400)
      expect(response.headers.get('location')).toBeNull()
    })

    it('rejects a wrong PKCE verifier and a replayed code', async () => {
      const clientId = await registerClient(server.baseUrl)
      const { requestId, verifier } = await beginAuthorization(
        server.baseUrl,
        clientId
      )
      const consent = await submitConsent(server.baseUrl, requestId!, 'approve')
      const state = new URL(consent.headers.get('location')!).searchParams.get(
        'state'
      )
      const callback = await fetch(
        `${server.baseUrl}/callback?code=good-code&state=${state}`,
        { redirect: 'manual' }
      )
      const code = new URL(callback.headers.get('location')!).searchParams.get(
        'code'
      )!
      const params = {
        grant_type: 'authorization_code',
        client_id: clientId,
        code,
        redirect_uri: CLIENT_REDIRECT
      }

      const wrong = await exchangeToken(server.baseUrl, {
        ...params,
        code_verifier: 'w'.repeat(43)
      })
      expect(wrong.status).toBe(400)

      const good = await exchangeToken(server.baseUrl, {
        ...params,
        code_verifier: verifier
      })
      expect(good.status).toBe(200)

      const replay = await exchangeToken(server.baseUrl, {
        ...params,
        code_verifier: verifier
      })
      expect(replay.status).toBe(400)
    })

    it('rotates refresh tokens and retires the old pair', async () => {
      const { clientId, tokens } = await signIn(server.baseUrl)
      const refreshed = await exchangeToken(server.baseUrl, {
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: tokens.refresh_token
      })
      expect(refreshed.status).toBe(200)
      const next = (await refreshed.json()) as Tokens
      expect(next.access_token).not.toBe(tokens.access_token)

      await expect(
        server.provider.verifyAccessToken(tokens.access_token)
      ).rejects.toThrow()
      await expect(
        server.provider.verifyAccessToken(next.access_token)
      ).resolves.toMatchObject({ extra: { userId: 'user0' } })

      const reuse = await exchangeToken(server.baseUrl, {
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: tokens.refresh_token
      })
      expect(reuse.status).toBe(400)
    })

    it('revoking a token signs the user out of Audius and ends MCP sessions', async () => {
      const { clientId, tokens } = await signIn(server.baseUrl)
      const { client } = await connectMcpClient(
        server.baseUrl,
        tokens.access_token
      )
      expect(server.mcp.sessionCount()).toBe(1)

      const response = await fetch(`${server.baseUrl}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          token: tokens.refresh_token
        })
      })
      expect(response.status).toBe(200)
      expect(server.sessions[0]!.loggedOut).toBe(true)
      expect(server.mcp.sessionCount()).toBe(0)
      await expect(
        server.provider.verifyAccessToken(tokens.access_token)
      ).rejects.toThrow()
      await client.close().catch(() => {})
    })
  })

  describe('tools', () => {
    it('lists all twenty tools with titles and annotations', async () => {
      const { tokens } = await signIn(server.baseUrl)
      const { client } = await connectMcpClient(
        server.baseUrl,
        tokens.access_token
      )
      const { tools } = await client.listTools()
      const byName = new Map(tools.map((tool) => [tool.name, tool]))

      expect([...byName.keys()].sort()).toEqual(
        [...READ_ONLY_TOOLS, ...Object.keys(WRITE_TOOLS)].sort()
      )
      for (const tool of tools) {
        expect(tool.title, tool.name).toBeTruthy()
        expect(tool.description, tool.name).toBeTruthy()
      }
      for (const name of READ_ONLY_TOOLS) {
        expect(byName.get(name)!.annotations?.readOnlyHint, name).toBe(true)
      }
      for (const [name, destructive] of Object.entries(WRITE_TOOLS)) {
        const annotations = byName.get(name)!.annotations
        expect(annotations?.readOnlyHint, name).toBe(false)
        expect(annotations?.destructiveHint, name).toBe(destructive)
      }
      await client.close()
    })

    it('runs tools against the signed-in user', async () => {
      const { tokens } = await signIn(server.baseUrl)
      const { client } = await connectMcpClient(
        server.baseUrl,
        tokens.access_token
      )
      const { sdk } = server.sessions[0]!

      const search = await client.callTool({
        name: 'search_tracks',
        arguments: { query: 'one' }
      })
      expect(JSON.parse(textOf(search)).tracks[0]).toMatchObject({
        id: 't1',
        title: 'One',
        url: 'https://audius.co/artist/t1'
      })
      expect(sdk.tracks.searchTracks).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'one', limit: 10, offset: 0 })
      )

      await client.callTool({
        name: 'favorite_track',
        arguments: { track_id: 't1' }
      })
      expect(sdk.tracks.favoriteTrack).toHaveBeenCalledWith({
        trackId: 't1',
        userId: 'user0'
      })

      const reposts = await client.callTool({
        name: 'get_my_reposts',
        arguments: {}
      })
      expect(
        JSON.parse(textOf(reposts)).reposts.map(
          (r: { item: { id: string } }) => r.item.id
        )
      ).toEqual(['t1', 'pl1'])
      await client.close()
    })

    it('edits playlist contents by rewriting the track list', async () => {
      const { tokens } = await signIn(server.baseUrl)
      const { client } = await connectMcpClient(
        server.baseUrl,
        tokens.access_token
      )
      const { sdk } = server.sessions[0]!

      await client.callTool({
        name: 'add_track_to_playlist',
        arguments: { playlist_id: 'pl1', track_id: 't3' }
      })
      const added = sdk.playlists.updatePlaylist.mock.calls[0] as unknown as [
        { metadata: { playlistContents: Array<{ trackId: string }> } }
      ]
      expect(
        added[0].metadata.playlistContents.map((entry) => entry.trackId)
      ).toEqual(['t1', 't2', 't3'])

      await client.callTool({
        name: 'remove_track_from_playlist',
        arguments: { playlist_id: 'pl1', track_id: 't1' }
      })
      const removed = sdk.playlists.updatePlaylist.mock.calls[1] as unknown as [
        { metadata: { playlistContents: Array<{ trackId: string }> } }
      ]
      expect(
        removed[0].metadata.playlistContents.map((entry) => entry.trackId)
      ).toEqual(['t2'])

      const missing = await client.callTool({
        name: 'remove_track_from_playlist',
        arguments: { playlist_id: 'pl1', track_id: 'nope' }
      })
      expect(missing.isError).toBe(true)
      await client.close()
    })

    it('refuses to edit a playlist owned by someone else', async () => {
      const { tokens } = await signIn(server.baseUrl)
      const { client } = await connectMcpClient(
        server.baseUrl,
        tokens.access_token
      )
      const { sdk } = server.sessions[0]!
      sdk.playlists.getPlaylist.mockResolvedValueOnce({
        data: [
          {
            ...(await sdk.playlists.getPlaylist()).data[0]!,
            user: { id: 'someone-else' } as never
          }
        ]
      })
      sdk.playlists.getPlaylist.mockClear()

      const result = await client.callTool({
        name: 'add_track_to_playlist',
        arguments: { playlist_id: 'pl1', track_id: 't3' }
      })
      expect(result.isError).toBe(true)
      expect(sdk.playlists.updatePlaylist).not.toHaveBeenCalled()
      await client.close()
    })

    it('only sends the fields that were provided when updating a track', async () => {
      const { tokens } = await signIn(server.baseUrl)
      const { client } = await connectMcpClient(
        server.baseUrl,
        tokens.access_token
      )
      const { sdk } = server.sessions[0]!

      await client.callTool({
        name: 'update_track_metadata',
        arguments: { track_id: 't1', title: 'New', tags: ['a', 'b'] }
      })
      expect(sdk.tracks.updateTrack).toHaveBeenCalledWith({
        trackId: 't1',
        userId: 'user0',
        metadata: { title: 'New', tags: 'a,b' }
      })

      const empty = await client.callTool({
        name: 'update_track_metadata',
        arguments: { track_id: 't1' }
      })
      expect(empty.isError).toBe(true)

      sdk.tracks.updateTrack.mockClear()
      sdk.tracks.getTrack.mockResolvedValueOnce({
        data: { ...track('t9', 'Theirs'), user: user('someone-else', 'them') }
      })
      const notMine = await client.callTool({
        name: 'update_track_metadata',
        arguments: { track_id: 't9', title: 'Hijacked' }
      })
      expect(notMine.isError).toBe(true)
      expect(textOf(notMine)).toContain('tracks that you own')
      expect(sdk.tracks.updateTrack).not.toHaveBeenCalled()
      await client.close()
    })

    it('ranks top fans by plays totalled across the artist tracks', async () => {
      const { tokens } = await signIn(server.baseUrl)
      const { client } = await connectMcpClient(
        server.baseUrl,
        tokens.access_token
      )
      const { sdk } = server.sessions[0]!
      sdk.users.getTracksByUser.mockResolvedValueOnce({
        data: [track('t1', 'One'), track('t2', 'Two')]
      })
      sdk.tracks.getTrackTopListenersRaw.mockImplementation(
        async ({ trackId }) =>
          listenersResponse(
            trackId === 't1'
              ? [
                  { id: 'a', handle: 'ann', count: 5 },
                  { id: 'b', handle: 'bo', count: 4 },
                  { id: 'user0', handle: 'me', count: 99 }
                ]
              : [{ id: 'b', handle: 'bo', count: 3 }]
          )
      )

      const all = JSON.parse(
        textOf(await client.callTool({ name: 'get_top_fans', arguments: {} }))
      )
      expect(all.tracks_considered).toBe(2)
      expect(all.top_fans).toEqual([
        {
          rank: 1,
          play_count: 7,
          tracks_played: 2,
          user: { id: 'b', handle: 'bo', name: 'bo', is_verified: false }
        },
        {
          rank: 2,
          play_count: 5,
          tracks_played: 1,
          user: { id: 'a', handle: 'ann', name: 'ann', is_verified: false }
        }
      ])

      const single = JSON.parse(
        textOf(
          await client.callTool({
            name: 'get_top_fans',
            arguments: { track_id: 't2', limit: 5 }
          })
        )
      )
      expect(sdk.tracks.getTrackTopListenersRaw).toHaveBeenLastCalledWith({
        trackId: 't2',
        limit: 5,
        offset: 0
      })
      expect(single.top_fans).toEqual([
        {
          rank: 1,
          play_count: 3,
          user: { id: 'b', handle: 'bo', name: 'bo', is_verified: false }
        }
      ])
      await client.close()
    })

    it('reports Audius API failures as tool errors', async () => {
      const { tokens } = await signIn(server.baseUrl)
      const { client } = await connectMcpClient(
        server.baseUrl,
        tokens.access_token
      )
      server.sessions[0]!.sdk.tracks.repostTrack.mockRejectedValueOnce(
        Object.assign(new Error('Response returned an error code'), {
          response: new Response(JSON.stringify({ error: 'track is gone' }), {
            status: 404
          })
        })
      )
      const result = await client.callTool({
        name: 'repost_track',
        arguments: { track_id: 't1' }
      })
      expect(result.isError).toBe(true)
      expect(textOf(result)).toBe('Audius API error 404: track is gone')
      await client.close()
    })

    it("keeps one user's MCP session out of reach of another user's token", async () => {
      const first = await signIn(server.baseUrl)
      const second = await signIn(server.baseUrl)
      const { client, transport } = await connectMcpClient(
        server.baseUrl,
        first.tokens.access_token
      )

      const response = await fetch(`${server.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          Authorization: `Bearer ${second.tokens.access_token}`,
          'Mcp-Session-Id': transport.sessionId!
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
      })
      expect(response.status).toBe(403)

      const other = await connectMcpClient(
        server.baseUrl,
        second.tokens.access_token
      )
      await other.client.callTool({
        name: 'favorite_track',
        arguments: { track_id: 't9' }
      })
      expect(server.sessions[1]!.sdk.tracks.favoriteTrack).toHaveBeenCalledWith(
        { trackId: 't9', userId: 'user1' }
      )
      expect(
        server.sessions[0]!.sdk.tracks.favoriteTrack
      ).not.toHaveBeenCalled()
      await client.close()
      await other.client.close()
    })
  })
})
