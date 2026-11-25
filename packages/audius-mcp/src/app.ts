import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js'
import {
  getOAuthProtectedResourceMetadataUrl,
  mcpAuthRouter
} from '@modelcontextprotocol/sdk/server/auth/router.js'
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js'
import type { NextFunction, Request, Response } from 'express'

import type { AudiusSessionFactory } from './audius/session.js'
import { PAGE_HEADERS, renderMessagePage } from './auth/pages.js'
import { AudiusOAuthProvider, AuthFlowError } from './auth/provider.js'
import { type Config, mcpUrl } from './config.js'
import { createMcpHandler, SERVER_NAME, SERVER_VERSION } from './mcp.js'

const SWEEP_INTERVAL_MS = 60 * 1000
const DOCS_URL =
  'https://github.com/AudiusProject/apps/tree/main/packages/audius-mcp'

const sendPage = (
  res: Response,
  status: number,
  title: string,
  message: string
) => {
  res.status(status).set(PAGE_HEADERS).send(renderMessagePage(title, message))
}

const MAX_FORM_BYTES = 4096

const readForm = async (req: Request) => {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_FORM_BYTES) {
      throw new AuthFlowError('The sign-in request is too large.')
    }
    chunks.push(chunk)
  }
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'))
}

const sendAuthFlowError = (res: Response, error: unknown) => {
  if (error instanceof AuthFlowError) {
    sendPage(res, 400, 'Sign-in could not continue', error.message)
    return
  }
  console.error('[audius-mcp] auth flow failed:', error)
  sendPage(
    res,
    500,
    'Something went wrong',
    'Audius sign-in failed. Go back to your app and try connecting again.'
  )
}

export const createApp = ({
  config,
  createSession
}: {
  config: Config
  createSession: AudiusSessionFactory
}) => {
  const provider = new AudiusOAuthProvider(createSession)
  const mcp = createMcpHandler({ provider, config })
  provider.onGrantRemoved = mcp.closeSessionsForGrant

  const resourceServerUrl = new URL(mcpUrl(config))
  const app = createMcpExpressApp({ host: new URL(config.publicUrl).hostname })
  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(
    mcpAuthRouter({
      provider,
      issuerUrl: new URL(config.publicUrl),
      resourceServerUrl,
      resourceName: 'Audius',
      serviceDocumentationUrl: new URL(DOCS_URL)
    })
  )

  app.get('/auth', (_req, res) => {
    sendPage(
      res,
      400,
      'Start from your MCP client',
      'This endpoint continues an Audius sign-in that an MCP client such as Claude started. Add this server as a connector in your client to begin.'
    )
  })

  app.post('/auth', async (req: Request, res: Response) => {
    try {
      const form = await readForm(req)
      const requestId = form.get('request')
      if (!requestId) {
        throw new AuthFlowError('The sign-in request is missing.')
      }
      const target =
        form.get('decision') === 'approve'
          ? await provider.startAudiusLogin(requestId)
          : provider.denyAuthorization(requestId)
      res.set('Cache-Control', 'no-store').redirect(303, target)
    } catch (error) {
      sendAuthFlowError(res, error)
    }
  })

  app.get('/callback', async (req: Request, res: Response) => {
    try {
      const target = await provider.finishAudiusLogin(
        new URL(req.originalUrl, config.publicUrl).href
      )
      res.set('Cache-Control', 'no-store').redirect(302, target)
    } catch (error) {
      sendAuthFlowError(res, error)
    }
  })

  const bearerAuth = requireBearerAuth({
    verifier: provider,
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(resourceServerUrl)
  })
  app.all('/mcp', bearerAuth, mcp.handle)

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', name: SERVER_NAME, version: SERVER_VERSION })
  })

  app.get('/', (_req, res) => {
    sendPage(
      res,
      200,
      'Audius MCP server',
      `Add ${mcpUrl(config)} as a custom connector in Claude to search Audius, manage your library and playlists, and manage your own tracks.`
    )
  })

  app.use(
    (error: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (res.headersSent) {
        next(error)
        return
      }
      const status = (error as { status?: number } | null)?.status
      if (status && status >= 400 && status < 500) {
        res.status(status).json({
          jsonrpc: '2.0',
          error: { code: -32700, message: 'Invalid request body' },
          id: null
        })
        return
      }
      console.error('[audius-mcp] unhandled error:', error)
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null
      })
    }
  )

  const sweepTimer = setInterval(() => {
    provider.sweep()
    mcp.sweep()
  }, SWEEP_INTERVAL_MS)
  sweepTimer.unref()

  return {
    app,
    provider,
    mcp,
    close: () => clearInterval(sweepTimer)
  }
}
