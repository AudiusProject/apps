# Audius Identity Service

The identity service maintains all the identity aspects of the Audius ecosystem such as storing encrypted auth ciphertexts, doing Twitter oauth and relay transactions on behalf of users

Read [the wiki](https://github.com/AudiusProject/apps/wiki/Identity-Service:-Overview) for more info.

## Coinflow session authentication

Coinflow purchase and withdrawal components obtain their session key from
`POST /coinflow/session-key`. The endpoint requires identity-service auth headers
and a fresh Ed25519 ownership proof from the Solana root wallet. The root wallet
is different from the public `spl_wallet` user bank address. No database migration
is required.

Configure these server-side environment variables before deploying the clients:

- `coinflowApiKey`: the secret Coinflow merchant API key. Use the key for the
  merchant configured in the clients (`audius` in development, `tikilabs` in
  production). Do not put this key in web/mobile environment files.
- `coinflowEnvironment`: `sandbox` (default) or `prod`, matching the clients.

Deploy the configured identity service before the web and mobile updates.
Existing mobile installations also need the client update; a backend deployment
alone does not migrate them. No Coinflow SDK upgrade is needed.

The client sends `{ wallet, environment, timestamp, signature }`, with a Unix
millisecond timestamp and base64 Ed25519 signature over the UTF-8 string
`Audius Coinflow session:<lowercase identity wallet>:<Solana root wallet>:<environment>:<timestamp>`.
The proof is valid for five minutes and is bound to the authenticated identity.
The endpoint returns `{ key, expiresAt }` with `Cache-Control: no-store`.

Session keys are kept in memory, scoped by identity, wallet, and environment,
and refreshed after 25 minutes. The components stop using an unrefreshed key
one minute before its documented 30-minute expiry. Upstream errors are sanitized
so merchant credentials are not logged or returned.

Before production rollout, verify purchase and withdrawal on web, iOS, and
Android in sandbox, including guest checkout, session refresh, failed refresh
and retry, logout, and account switching. Verify that the embedded Coinflow
requests use session authentication. Confirm completion with Coinflow only after
production rollout and verification.

References: [session-key API](https://docs.coinflow.cash/api-reference/api-reference/authentication/get-session-key),
[session lifetime](https://docs.coinflow.cash/guides/payouts/implementation-methods/bank-authentication-ui).
