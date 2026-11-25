const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const page = (title: string, body: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f7f7f9; color: #1b1b1f; }
  main { width: min(26rem, calc(100vw - 3rem)); padding: 2rem; border-radius: 1rem; background: #fff; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); }
  h1 { margin: 0 0 0.75rem; font-size: 1.35rem; line-height: 1.3; }
  p { margin: 0 0 1rem; }
  ul { margin: 0 0 1.25rem; padding-left: 1.2rem; }
  .muted { color: #6c6c78; font-size: 0.875rem; overflow-wrap: anywhere; }
  .actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
  button { flex: 1; padding: 0.7rem 1rem; border-radius: 0.6rem; border: 1px solid #d5d5dd; background: transparent; color: inherit; font: inherit; font-weight: 600; cursor: pointer; }
  button.primary { border-color: #7e1bcc; background: #7e1bcc; color: #fff; }
  @media (prefers-color-scheme: dark) {
    body { background: #121216; color: #f2f2f5; }
    main { background: #1d1d23; box-shadow: none; }
    .muted { color: #a3a3b0; }
    button { border-color: #3a3a45; }
  }
</style>
</head>
<body><main>${body}</main></body>
</html>`

export const renderConsentPage = ({
  requestId,
  clientName,
  redirectHost
}: {
  requestId: string
  clientName: string
  redirectHost: string
}) =>
  page(
    'Connect to Audius',
    `<h1>Connect ${escapeHtml(clientName)} to Audius</h1>
<p>You will sign in with Audius next. Once you approve, ${escapeHtml(clientName)} will be able to:</p>
<ul>
  <li>Read your profile, favorites, reposts, followers and tracks</li>
  <li>Favorite and repost tracks, and create and edit your playlists</li>
  <li>Upload tracks and edit the details of tracks you own</li>
</ul>
<p class="muted">It cannot read your messages or move funds from your wallet. After you approve you will be sent back to <strong>${escapeHtml(redirectHost)}</strong>.</p>
<form method="post" action="/auth">
  <input type="hidden" name="request" value="${escapeHtml(requestId)}">
  <div class="actions">
    <button type="submit" name="decision" value="deny">Cancel</button>
    <button type="submit" name="decision" value="approve" class="primary">Continue to Audius</button>
  </div>
</form>`
  )

export const renderMessagePage = (title: string, message: string) =>
  page(title, `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>`)

export const PAGE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
}
