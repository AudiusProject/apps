import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'

const MAX_REDIRECTS = 3
const FETCH_TIMEOUT_MS = 120_000

const blocked = new BlockList()
blocked.addSubnet('0.0.0.0', 8, 'ipv4')
blocked.addSubnet('10.0.0.0', 8, 'ipv4')
blocked.addSubnet('100.64.0.0', 10, 'ipv4')
blocked.addSubnet('127.0.0.0', 8, 'ipv4')
blocked.addSubnet('169.254.0.0', 16, 'ipv4')
blocked.addSubnet('172.16.0.0', 12, 'ipv4')
blocked.addSubnet('192.0.0.0', 24, 'ipv4')
blocked.addSubnet('192.168.0.0', 16, 'ipv4')
blocked.addSubnet('198.18.0.0', 15, 'ipv4')
blocked.addSubnet('224.0.0.0', 3, 'ipv4')
blocked.addAddress('::', 'ipv6')
blocked.addAddress('::1', 'ipv6')
blocked.addSubnet('64:ff9b::', 96, 'ipv6')
blocked.addSubnet('fc00::', 7, 'ipv6')
blocked.addSubnet('fe80::', 10, 'ipv6')
blocked.addSubnet('ff00::', 8, 'ipv6')

export const isPublicAddress = (address: string) => {
  const family = isIP(address)
  if (family === 0) return false
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)
  if (mapped?.[1]) return !blocked.check(mapped[1], 'ipv4')
  return !blocked.check(address, family === 4 ? 'ipv4' : 'ipv6')
}

const assertPublicUrl = async (url: URL) => {
  if (url.protocol !== 'https:') {
    throw new Error('File URLs must use https')
  }
  if (url.username || url.password) {
    throw new Error('File URLs must not contain credentials')
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(hostname)
    ? [hostname]
    : (await lookup(hostname, { all: true })).map((entry) => entry.address)
  if (addresses.length === 0 || !addresses.every(isPublicAddress)) {
    throw new Error('File URLs must point to a public host')
  }
}

export type RemoteFile = {
  buffer: Buffer
  name: string
  type: string
}

export const fetchRemoteFile = async ({
  url: rawUrl,
  maxBytes,
  accept
}: {
  url: string
  maxBytes: number
  accept: (contentType: string) => boolean
}): Promise<RemoteFile> => {
  let url = new URL(rawUrl)
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS)

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url)
    const response = await fetch(url, { redirect: 'manual', signal })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      await response.body?.cancel()
      if (!location) throw new Error('File URL redirected without a location')
      url = new URL(location, url)
      continue
    }
    if (!response.ok || !response.body) {
      await response.body?.cancel()
      throw new Error(`Could not download file (HTTP ${response.status})`)
    }

    const type = (response.headers.get('content-type') ?? '')
      .split(';')[0]!
      .trim()
      .toLowerCase()
    if (!accept(type)) {
      await response.body.cancel()
      throw new Error(`Unsupported file type "${type || 'unknown'}"`)
    }
    const declared = Number(response.headers.get('content-length'))
    if (declared > maxBytes) {
      await response.body.cancel()
      throw new Error('File is larger than the upload limit')
    }

    const chunks: Uint8Array[] = []
    let received = 0
    const reader = response.body.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      received += value.byteLength
      if (received > maxBytes) {
        await reader.cancel()
        throw new Error('File is larger than the upload limit')
      }
      chunks.push(value)
    }
    const name =
      decodeURIComponent(url.pathname.split('/').pop() ?? '') || 'upload'
    return { buffer: Buffer.concat(chunks), name, type }
  }
  throw new Error('File URL redirected too many times')
}
