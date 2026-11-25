import { randomBytes, randomUUID } from 'node:crypto'

import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js'
import {
  InvalidGrantError,
  InvalidTokenError
} from '@modelcontextprotocol/sdk/server/auth/errors.js'
import type {
  AuthorizationParams,
  OAuthServerProvider
} from '@modelcontextprotocol/sdk/server/auth/provider.js'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens
} from '@modelcontextprotocol/sdk/shared/auth.js'
import type { Response } from 'express'

import type {
  AudiusSession,
  AudiusSessionFactory,
  AudiusUser
} from '../audius/session.js'

import { PAGE_HEADERS, renderConsentPage } from './pages.js'

const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE

export const PENDING_TTL_MS = 10 * MINUTE
export const CODE_TTL_MS = 5 * MINUTE
export const ACCESS_TOKEN_TTL_MS = 60 * MINUTE
export const REFRESH_TOKEN_TTL_MS = 30 * DAY
const MAX_PENDING = 5000
const MAX_CLIENTS = 5000

export type Grant = {
  id: string
  user: AudiusUser
  session: AudiusSession
  clientId: string
  createdAt: number
}

type PendingAuthorization = {
  id: string
  client: OAuthClientInformationFull
  params: AuthorizationParams
  expiresAt: number
  session?: AudiusSession
  audiusState?: string
}

type AuthorizationCode = {
  grantId: string
  clientId: string
  codeChallenge: string
  redirectUri: string
  scopes: string[]
  resource?: URL
  expiresAt: number
}

type TokenRecord = {
  grantId: string
  clientId: string
  scopes: string[]
  resource?: URL
  expiresAt: number
  pairedAccessToken?: string
}

export class AuthFlowError extends Error {}

const randomToken = () => randomBytes(32).toString('base64url')

class InMemoryClientsStore implements OAuthRegisteredClientsStore {
  private readonly clients = new Map<string, OAuthClientInformationFull>()

  async getClient(clientId: string) {
    return this.clients.get(clientId)
  }

  async registerClient(client: OAuthClientInformationFull) {
    if (this.clients.size >= MAX_CLIENTS) {
      const oldest = this.clients.keys().next().value
      if (oldest !== undefined) this.clients.delete(oldest)
    }
    this.clients.set(client.client_id, client)
    return client
  }
}

export class AudiusOAuthProvider implements OAuthServerProvider {
  readonly clientsStore = new InMemoryClientsStore()
  onGrantRemoved?: (grantId: string) => void

  private readonly pending = new Map<string, PendingAuthorization>()
  private readonly pendingByAudiusState = new Map<string, string>()
  private readonly codes = new Map<string, AuthorizationCode>()
  private readonly accessTokens = new Map<string, TokenRecord>()
  private readonly refreshTokens = new Map<string, TokenRecord>()
  private readonly grants = new Map<string, Grant>()

  private readonly createSession: AudiusSessionFactory
  private readonly now: () => number

  constructor(
    createSession: AudiusSessionFactory,
    now: () => number = Date.now
  ) {
    this.createSession = createSession
    this.now = now
  }

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ) {
    this.sweep()
    if (this.pending.size >= MAX_PENDING) {
      const oldest = this.pending.keys().next().value
      if (oldest !== undefined) this.dropPending(oldest)
    }
    const id = randomToken()
    this.pending.set(id, {
      id,
      client,
      params,
      expiresAt: this.now() + PENDING_TTL_MS
    })
    res
      .status(200)
      .set(PAGE_HEADERS)
      .send(
        renderConsentPage({
          requestId: id,
          clientName: client.client_name?.trim() || 'An application',
          redirectHost: new URL(params.redirectUri).host
        })
      )
  }

  async startAudiusLogin(requestId: string) {
    const pending = this.livePending(requestId)
    if (pending.audiusState) {
      this.pendingByAudiusState.delete(pending.audiusState)
    }
    const session = this.createSession()
    const { url, state } = await session.beginLogin()
    pending.session = session
    pending.audiusState = state
    this.pendingByAudiusState.set(state, pending.id)
    return url
  }

  denyAuthorization(requestId: string) {
    const pending = this.livePending(requestId)
    this.dropPending(pending.id)
    return this.clientRedirect(pending, {
      error: 'access_denied',
      error_description: 'The user cancelled the request'
    })
  }

  async finishAudiusLogin(redirectUrl: string) {
    const url = new URL(redirectUrl)
    const state = url.searchParams.get('state')
    const requestId = state ? this.pendingByAudiusState.get(state) : undefined
    if (!requestId) {
      throw new AuthFlowError(
        'This sign-in link has expired or was already used.'
      )
    }
    const pending = this.livePending(requestId)
    this.dropPending(pending.id)
    const { session } = pending
    if (!session) {
      throw new AuthFlowError('This sign-in request was never started.')
    }

    if (url.searchParams.get('error') || !url.searchParams.get('code')) {
      return this.clientRedirect(pending, {
        error: 'access_denied',
        error_description:
          url.searchParams.get('error_description') ??
          'Audius sign-in was not approved'
      })
    }

    let user: AudiusUser
    try {
      user = await session.completeLogin(redirectUrl)
    } catch (e) {
      return this.clientRedirect(pending, {
        error: 'server_error',
        error_description:
          e instanceof Error ? e.message : 'Audius sign-in failed'
      })
    }

    const grant: Grant = {
      id: randomUUID(),
      user,
      session,
      clientId: pending.client.client_id,
      createdAt: this.now()
    }
    this.grants.set(grant.id, grant)

    const code = randomToken()
    this.codes.set(code, {
      grantId: grant.id,
      clientId: pending.client.client_id,
      codeChallenge: pending.params.codeChallenge,
      redirectUri: pending.params.redirectUri,
      scopes: pending.params.scopes ?? [],
      resource: pending.params.resource,
      expiresAt: this.now() + CODE_TTL_MS
    })
    return this.clientRedirect(pending, { code })
  }

  async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string
  ) {
    return this.liveCode(client, authorizationCode).codeChallenge
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    redirectUri?: string
  ): Promise<OAuthTokens> {
    const code = this.liveCode(client, authorizationCode)
    this.codes.delete(authorizationCode)
    if (redirectUri !== undefined && redirectUri !== code.redirectUri) {
      this.removeGrant(code.grantId)
      throw new InvalidGrantError('redirect_uri does not match')
    }
    return this.issueTokens(code)
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string
  ): Promise<OAuthTokens> {
    const record = this.refreshTokens.get(refreshToken)
    if (
      !record ||
      record.clientId !== client.client_id ||
      record.expiresAt <= this.now() ||
      !this.grants.has(record.grantId)
    ) {
      throw new InvalidGrantError('Refresh token is invalid or expired')
    }
    this.refreshTokens.delete(refreshToken)
    if (record.pairedAccessToken) {
      this.accessTokens.delete(record.pairedAccessToken)
    }
    return this.issueTokens(record)
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const record = this.accessTokens.get(token)
    const grant = record ? this.grants.get(record.grantId) : undefined
    if (!record || !grant || record.expiresAt <= this.now()) {
      throw new InvalidTokenError('Access token is invalid or expired')
    }
    return {
      token,
      clientId: record.clientId,
      scopes: record.scopes,
      expiresAt: Math.floor(record.expiresAt / 1000),
      resource: record.resource,
      extra: { grantId: grant.id, userId: grant.user.id }
    }
  }

  async revokeToken(
    client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest
  ) {
    const record =
      this.refreshTokens.get(request.token) ??
      this.accessTokens.get(request.token)
    if (!record || record.clientId !== client.client_id) return
    this.removeGrant(record.grantId)
  }

  getGrant(grantId: string) {
    return this.grants.get(grantId)
  }

  sweep() {
    const now = this.now()
    for (const [id, pending] of this.pending) {
      if (pending.expiresAt <= now) this.dropPending(id)
    }
    for (const [code, record] of this.codes) {
      if (record.expiresAt <= now) this.codes.delete(code)
    }
    for (const [token, record] of this.accessTokens) {
      if (record.expiresAt <= now) this.accessTokens.delete(token)
    }
    for (const [token, record] of this.refreshTokens) {
      if (record.expiresAt <= now) this.refreshTokens.delete(token)
    }
    const reachable = new Set<string>()
    for (const record of this.codes.values()) reachable.add(record.grantId)
    for (const record of this.accessTokens.values()) {
      reachable.add(record.grantId)
    }
    for (const record of this.refreshTokens.values()) {
      reachable.add(record.grantId)
    }
    for (const grantId of this.grants.keys()) {
      if (!reachable.has(grantId)) this.removeGrant(grantId)
    }
  }

  private issueTokens(source: {
    grantId: string
    clientId: string
    scopes: string[]
    resource?: URL
  }): OAuthTokens {
    const base = {
      grantId: source.grantId,
      clientId: source.clientId,
      scopes: source.scopes,
      resource: source.resource
    }
    const accessToken = randomToken()
    const refreshToken = randomToken()
    this.accessTokens.set(accessToken, {
      ...base,
      expiresAt: this.now() + ACCESS_TOKEN_TTL_MS
    })
    this.refreshTokens.set(refreshToken, {
      ...base,
      expiresAt: this.now() + REFRESH_TOKEN_TTL_MS,
      pairedAccessToken: accessToken
    })
    return {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: ACCESS_TOKEN_TTL_MS / 1000,
      refresh_token: refreshToken,
      scope: source.scopes.join(' ')
    }
  }

  private removeGrant(grantId: string) {
    const grant = this.grants.get(grantId)
    if (!grant) return
    this.grants.delete(grantId)
    for (const [code, record] of this.codes) {
      if (record.grantId === grantId) this.codes.delete(code)
    }
    for (const [token, record] of this.accessTokens) {
      if (record.grantId === grantId) this.accessTokens.delete(token)
    }
    for (const [token, record] of this.refreshTokens) {
      if (record.grantId === grantId) this.refreshTokens.delete(token)
    }
    grant.session.logout().catch(() => {})
    this.onGrantRemoved?.(grantId)
  }

  private livePending(requestId: string) {
    const pending = this.pending.get(requestId)
    if (!pending || pending.expiresAt <= this.now()) {
      if (pending) this.dropPending(requestId)
      throw new AuthFlowError(
        'This sign-in request has expired. Go back to your app and connect again.'
      )
    }
    return pending
  }

  private dropPending(requestId: string) {
    const pending = this.pending.get(requestId)
    if (pending?.audiusState) {
      this.pendingByAudiusState.delete(pending.audiusState)
    }
    this.pending.delete(requestId)
  }

  private liveCode(client: OAuthClientInformationFull, code: string) {
    const record = this.codes.get(code)
    if (
      !record ||
      record.clientId !== client.client_id ||
      record.expiresAt <= this.now()
    ) {
      throw new InvalidGrantError('Authorization code is invalid or expired')
    }
    return record
  }

  private clientRedirect(
    pending: PendingAuthorization,
    query: Record<string, string>
  ) {
    const target = new URL(pending.params.redirectUri)
    for (const [key, value] of Object.entries(query)) {
      target.searchParams.set(key, value)
    }
    if (pending.params.state !== undefined) {
      target.searchParams.set('state', pending.params.state)
    }
    return target.href
  }
}
