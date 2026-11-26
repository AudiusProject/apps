import { randomUUID } from 'node:crypto'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import type { Request, RequestHandler, Response } from 'express'

import type { AudiusOAuthProvider } from './auth/provider.js'
import type { Config } from './config.js'
import { registerTools } from './tools/index.js'

export const SERVER_NAME = 'audius'
export const SERVER_VERSION = '0.1.0'
const SESSION_IDLE_TTL_MS = 60 * 60 * 1000

const INSTRUCTIONS = `Audius is a music streaming platform. These tools act on behalf of the signed-in Audius user, both as a listener (search, favorites, reposts, playlists) and as an artist (their uploads, stats, followers, track metadata, uploading).

Tracks, users and playlists are identified by short string IDs returned in the \`id\` field of results; use a search tool first when you only have a name. Favorites, reposts, public playlists and uploads are visible to other people, so confirm with the user before making changes they did not explicitly ask for.`

type McpSession = {
  transport: StreamableHTTPServerTransport
  grantId: string
  lastSeenAt: number
}

const rpcError = (res: Response, status: number, message: string) => {
  res.status(status).json({
    jsonrpc: '2.0',
    error: { code: -32000, message },
    id: null
  })
}

export const createMcpHandler = ({
  provider,
  config
}: {
  provider: AudiusOAuthProvider
  config: Config
}) => {
  const sessions = new Map<string, McpSession>()

  const closeSession = (sessionId: string) => {
    const session = sessions.get(sessionId)
    if (!session) return
    sessions.delete(sessionId)
    session.transport.close().catch(() => {})
  }

  const closeSessionsForGrant = (grantId: string) => {
    for (const [sessionId, session] of sessions) {
      if (session.grantId === grantId) closeSession(sessionId)
    }
  }

  const sweep = (now = Date.now()) => {
    for (const [sessionId, session] of sessions) {
      if (now - session.lastSeenAt > SESSION_IDLE_TTL_MS) {
        closeSession(sessionId)
      }
    }
  }

  const createServer = () => {
    const server = new McpServer(
      { name: SERVER_NAME, title: 'Audius', version: SERVER_VERSION },
      { instructions: INSTRUCTIONS }
    )
    registerTools(server, (authInfo) => {
      const grantId = authInfo?.extra?.grantId
      const grant =
        typeof grantId === 'string' ? provider.getGrant(grantId) : undefined
      if (!grant) {
        throw new Error(
          'Not signed in to Audius. Reconnect the Audius connector and try again.'
        )
      }
      return { sdk: grant.session.sdk, userId: grant.user.id, config }
    })
    return server
  }

  const handle: RequestHandler = (req, res, next) => {
    handleRequest(req, res).catch(next)
  }

  const handleRequest = async (req: Request, res: Response) => {
    const grantId = req.auth?.extra?.grantId
    if (typeof grantId !== 'string') {
      rpcError(res, 401, 'Unauthorized')
      return
    }

    const header = req.headers['mcp-session-id']
    const sessionId = Array.isArray(header) ? header[0] : header

    if (sessionId) {
      const session = sessions.get(sessionId)
      if (!session) {
        rpcError(res, 404, 'Session not found')
        return
      }
      if (session.grantId !== grantId) {
        rpcError(res, 403, 'Session belongs to a different user')
        return
      }
      session.lastSeenAt = Date.now()
      await session.transport.handleRequest(req, res, req.body)
      return
    }

    if (req.method !== 'POST' || !isInitializeRequest(req.body)) {
      rpcError(res, 400, 'Bad Request: no valid session ID provided')
      return
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, { transport, grantId, lastSeenAt: Date.now() })
      }
    })
    transport.onclose = () => {
      if (transport.sessionId) sessions.delete(transport.sessionId)
    }
    await createServer().connect(transport)
    await transport.handleRequest(req, res, req.body)
  }

  return {
    handle,
    sweep,
    closeSessionsForGrant,
    sessionCount: () => sessions.size
  }
}
