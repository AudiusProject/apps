import type { SolanaWalletAddress } from '@audius/common/models'
import { isValidSolAddress } from '@audius/common/store'
import queryString from 'query-string'

import { messages } from '../messages'
import type { OAuthFlow, ParsedParams } from '../types'
import { collapseScope, getIsRedirectValid, isValidApiKey } from '../utils'

export const useParsedParams = (search: string): ParsedParams => {
  const {
    scope: rawScope,
    state,
    redirect_uri: redirectUri,
    api_key,
    client_id,
    app_name: appName,
    response_mode: responseMode,
    response_type: responseType,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    tx,
    wallet,
    recipient,
    amount,
    mint
  } = queryString.parse(search)

  const scope = collapseScope(rawScope)
  const apiKey =
    typeof api_key === 'string'
      ? api_key
      : typeof client_id === 'string'
        ? client_id
        : null
  const redirectUriStr = typeof redirectUri === 'string' ? redirectUri : null

  let error: string | null = null

  // ── Payment flow ───────────────────────────────────────────────────────────
  if (
    typeof recipient === 'string' ||
    typeof amount === 'string' ||
    typeof mint === 'string'
  ) {
    if (!getIsRedirectValid(redirectUriStr)) {
      error = messages.redirectURIInvalidError
    } else if (!recipient || typeof recipient !== 'string') {
      error = messages.missingParamsError
    } else if (!isValidSolAddress(recipient as SolanaWalletAddress)) {
      error = messages.invalidRecipientError
    } else if (!amount || typeof amount !== 'string') {
      error = messages.missingParamsError
    } else {
      try {
        if (BigInt(amount) <= 0) error = messages.invalidAmountError
      } catch {
        error = messages.invalidAmountError
      }
    }
    if (!error && (!mint || typeof mint !== 'string')) {
      error = messages.missingMintError
    }

    return {
      flow: 'payment',
      scope: null,
      apiKey,
      appName: typeof appName === 'string' ? appName : null,
      responseType: null,
      codeChallenge: null,
      codeChallengeMethod: null,
      tx: null,
      wallet: null,
      recipient: typeof recipient === 'string' ? recipient : null,
      amount: typeof amount === 'string' ? amount : null,
      mint: typeof mint === 'string' ? mint : null,
      state: typeof state === 'string' ? state : null,
      redirectUri: redirectUriStr,
      responseMode: typeof responseMode === 'string' ? responseMode : null,
      error
    }
  }

  // ── Auth flows ─────────────────────────────────────────────────────────────
  if (!getIsRedirectValid(redirectUriStr)) {
    error = messages.redirectURIInvalidError
  } else if (scope !== 'read' && scope !== 'write') {
    error = messages.scopeError
  } else if (
    responseMode &&
    responseMode !== 'query' &&
    responseMode !== 'fragment'
  ) {
    error = messages.responseModeInvalidError
  } else if (scope === 'read') {
    if (!appName && !apiKey) error = messages.missingAppNameError
  } else if (scope === 'write') {
    if (!apiKey) {
      error = messages.missingApiKeyError
    } else if (!isValidApiKey(apiKey)) {
      error = messages.invalidApiKeyError
    } else if (tx === 'connect_dashboard_wallet') {
      // Requires postMessage back-channel — not possible in a native app
      error = messages.connectWalletNotSupportedError
    } else if (tx === 'disconnect_dashboard_wallet') {
      if (!wallet || typeof wallet !== 'string') {
        error = messages.writeOnceParamsError
      }
    }
  }

  // PKCE validations only required when response_type=code
  if (!error && responseType === 'code') {
    if (!codeChallenge || typeof codeChallenge !== 'string') {
      error = messages.missingCodeChallengeError
    } else if (codeChallengeMethod !== 'S256') {
      error = messages.invalidCodeChallengeMethodError
    }
  }

  const flow: OAuthFlow =
    responseType === 'code' ? 'pkce' : 'implicit'

  return {
    flow,
    scope,
    apiKey,
    appName: typeof appName === 'string' ? appName : null,
    responseType: typeof responseType === 'string' ? responseType : null,
    codeChallenge: typeof codeChallenge === 'string' ? codeChallenge : null,
    codeChallengeMethod:
      typeof codeChallengeMethod === 'string' ? codeChallengeMethod : null,
    tx: typeof tx === 'string' ? tx : null,
    wallet: typeof wallet === 'string' ? wallet : null,
    recipient: null,
    amount: null,
    mint: null,
    state: typeof state === 'string' ? state : null,
    redirectUri: redirectUriStr,
    responseMode: typeof responseMode === 'string' ? responseMode : null,
    error
  }
}
