/**
 * Shared debug helpers for mobile examples (session / op IDs, API request IDs).
 */

export function createSessionId(): string {
  try {
    const c = globalThis.crypto as Crypto | undefined
    if (c?.randomUUID) {
      return c.randomUUID().replace(/-/g, '').slice(0, 16)
    }
  } catch {
    /* noop */
  }
  return `s${Math.random().toString(36).slice(2, 14)}`
}

export function newOperationId(): string {
  try {
    const c = globalThis.crypto as Crypto | undefined
    if (c?.randomUUID) {
      return c.randomUUID().replace(/-/g, '').slice(0, 8)
    }
  } catch {
    /* noop */
  }
  return Math.random().toString(36).slice(2, 10)
}

/** Headers API gateways often attach — helps match client logs to server traces. */
export function extractServerRequestIds(res: Response): Record<string, string> {
  const out: Record<string, string> = {}
  const priority = [
    'x-request-id',
    'x-correlation-id',
    'cf-ray',
    'x-amzn-requestid',
    'x-envoy-decorator-operation',
    'traceparent'
  ]
  for (const name of priority) {
    const v = res.headers.get(name)
    if (v) {
      out[name] = v.trim()
    }
  }
  res.headers.forEach((value, key) => {
    if (/request.id|correlation|trace/i.test(key) && out[key] === undefined) {
      out[key] = value.trim()
    }
  })
  return out
}

export function primaryRequestId(ids: Record<string, string>): string | undefined {
  return (
    ids['x-request-id'] ??
    ids['x-correlation-id'] ??
    ids['cf-ray'] ??
    Object.values(ids)[0]
  )
}

export async function formatErrorForDebug(error: unknown): Promise<Record<string, unknown>> {
  const base = {
    message: error instanceof Error ? error.message : String(error)
  } as Record<string, unknown>

  if (error != null && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: Response }).response
    if (response != null) {
      const serverRequestIds = extractServerRequestIds(response)
      const rid = primaryRequestId(serverRequestIds)
      const bodyText = await response.text().catch(() => '')
      return {
        ...base,
        status: response.status,
        statusText: response.statusText,
        bodyText,
        serverRequestIds,
        ...(rid !== undefined ? { requestId: rid } : {})
      }
    }
  }
  return base
}
