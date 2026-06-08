/* eslint-disable no-console */
/**
 * Gated upload server: create-track + geo-gated stream signing.
 *
 * POST /create-track — create track with access_authorities (server signs stream access)
 * GET /stream/:trackId — geo-gate + sign stream URL, redirect (protocol enforces access_authorities)
 * GET /my-region — { ip, country, city, allowed, allowedCountries }
 *
 * Geo: ip-api.com. From localhost, pass ?ip= or ?client_ip= (e.g. from ipify).
 * Env: AUDIUS_API_KEY, AUDIUS_BEARER_TOKEN, SIGNER_PRIVATE_KEY, ALLOWED_COUNTRIES (default: United States)
 */
import 'dotenv/config'
import { secp256k1 } from '@noble/curves/secp256k1'
import { keccak_256 } from '@noble/hashes/sha3'
import { hexToBytes, utf8ToBytes, concatBytes } from '@noble/hashes/utils'
import canonicalize from 'canonicalize'
import { Wallet } from 'ethers'
import express from 'express'

const PORT = Number(process.env.PORT) || 3004
const apiKey = process.env.AUDIUS_API_KEY
const bearerToken = process.env.AUDIUS_BEARER_TOKEN
const signerPrivateKey = process.env.SIGNER_PRIVATE_KEY

if (!apiKey || !bearerToken) {
  console.error('Set AUDIUS_API_KEY and AUDIUS_BEARER_TOKEN in .env')
  process.exit(1)
}
if (!signerPrivateKey) {
  console.error('Set SIGNER_PRIVATE_KEY in .env')
  process.exit(1)
}

const signerWallet = new Wallet(
  signerPrivateKey.startsWith('0x') ? signerPrivateKey : `0x${signerPrivateKey}`
)
const signerAddress = signerWallet.address

const allowedCountries = (process.env.ALLOWED_COUNTRIES || 'United States')
  .split(',')
  .map((s) => s.trim().toLowerCase())
const allowedStr = allowedCountries
  .map((c) => c[0].toUpperCase() + c.slice(1))
  .join(', ')

const { sdk, decodeHashId } = await import('@audius/sdk')
const audius = sdk({
  appName: process.env.APP_NAME || 'gated-upload-example',
  apiKey,
  bearerToken
})

const isLocalhost = (ip) =>
  !ip ||
  ['::1', '127.0.0.1'].includes(String(ip).trim()) ||
  String(ip).startsWith('::ffff:127.')

async function getGeo(ip) {
  if (!ip || isLocalhost(ip)) return { country: null, city: null }
  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=country,city,status`
    )
    const data = await res.json()
    return data.status === 'fail'
      ? { country: null, city: null }
      : { country: data.country ?? null, city: data.city ?? null }
  } catch {
    return { country: null, city: null }
  }
}

function getIpContext(req, ipParam = 'client_ip') {
  const forwarded = req.headers['x-forwarded-for']
  const reqIp = forwarded
    ? forwarded.split(',')[0].trim()
    : (req.socket?.remoteAddress ?? req.ip ?? null)
  const clientIp =
    typeof req.query[ipParam] === 'string' ? req.query[ipParam].trim() : null
  const ipForGeo = isLocalhost(reqIp) && clientIp ? clientIp : reqIp
  return { reqIp, ipForGeo }
}

async function fetchTrack(trackId) {
  try {
    const { data } = await audius.tracks.getTrack({ trackId: String(trackId) })
    const cid = data?.trackCid ?? null
    const streamUrl = data?.stream?.url ?? data?.stream?.mirrors?.[0] ?? null
    return cid && streamUrl ? { cid, streamUrl } : null
  } catch {
    return null
  }
}

function signStreamUrl(cid, trackId, privateKeyHex) {
  const data = {
    upload_id: '',
    cid,
    shouldCache: 0,
    timestamp: Date.now(),
    trackId: Number(trackId),
    userId: 0
  }
  const canonical = canonicalize(data)
  if (!canonical) throw new Error('canonicalize failed')
  const hash = keccak_256(utf8ToBytes(canonical))
  const prefix = new TextEncoder().encode(
    `\x19Ethereum Signed Message:\n${hash.length}`
  )
  const hashToSign = keccak_256(concatBytes(prefix, hash))
  const pk = hexToBytes(privateKeyHex.replace(/^0x/, '').padStart(64, '0'))
  const { r, s, recovery } = secp256k1.sign(hashToSign, pk)
  const sigHex = `0x${r.toString(16).padStart(64, '0')}${s.toString(16).padStart(64, '0')}${(recovery + 27).toString(16).padStart(2, '0')}`
  return JSON.stringify({ data: JSON.stringify(data), signature: sigHex })
}

const opt = (v) => (v != null ? String(v) : undefined)

const app = express()
app.use(express.json({ limit: '1mb' }))
app.use((req, res, next) => {
  const o = req.headers.origin
  if (o && /^https?:\/\/localhost(:\d+)?$/.test(o))
    res.setHeader('Access-Control-Allow-Origin', o)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  req.method === 'OPTIONS' ? res.sendStatus(204) : next()
})

app.get('/my-region', async (req, res) => {
  const { reqIp, ipForGeo } = getIpContext(req, 'ip')
  const { country, city } = await getGeo(ipForGeo)
  const allowed = country
    ? allowedCountries.includes(country.toLowerCase())
    : false
  res.json({
    ip: reqIp,
    country: country ?? 'Unknown',
    city: city ?? null,
    allowed,
    allowedCountries: allowedStr.split(', ')
  })
})

app.get('/stream/:trackId', async (req, res) => {
  const { trackId } = req.params
  if (!trackId) return res.status(400).json({ error: 'Missing trackId' })

  const { ipForGeo } = getIpContext(req)
  const { country } = await getGeo(ipForGeo)
  const allowed = country
    ? allowedCountries.includes(country.toLowerCase())
    : false
  if (!allowed) {
    return res.status(403).json({
      error: `Streaming only available in: ${allowedStr}`,
      yourCountry: country ?? 'Unknown'
    })
  }

  const track = await fetchTrack(trackId)
  if (!track)
    return res
      .status(404)
      .json({ error: 'Track not found or stream unavailable' })

  const numericTrackId = decodeHashId(trackId) ?? parseInt(trackId, 10)
  if (numericTrackId == null || Number.isNaN(numericTrackId)) {
    return res.status(400).json({ error: 'Invalid track ID format' })
  }

  try {
    const url = new URL(track.streamUrl)
    url.searchParams.set(
      'signature',
      signStreamUrl(track.cid, numericTrackId, signerPrivateKey)
    )
    return res.redirect(302, url.toString())
  } catch (e) {
    console.error('signStreamUrl failed', e)
    return res.status(500).json({ error: 'Failed to sign stream URL' })
  }
})

app.post('/create-track', async (req, res) => {
  const { userId, metadata } = req.body ?? {}
  if (!userId || !metadata)
    return res.status(400).json({ error: 'Missing userId or metadata' })
  if (!metadata.title || !metadata.genre || !metadata.trackCid) {
    return res
      .status(400)
      .json({ error: 'metadata must include title, genre, trackCid' })
  }

  try {
    const duration =
      metadata.duration != null && Number(metadata.duration) > 0
        ? Number(metadata.duration)
        : undefined
    const result = await audius.tracks.createTrack({
      userId: String(userId),
      metadata: {
        title: String(metadata.title),
        genre: metadata.genre,
        trackCid: String(metadata.trackCid),
        description:
          metadata.description != null ? String(metadata.description) : null,
        accessAuthorities: [signerAddress],
        duration,
        origFileCid: opt(metadata.origFileCid),
        origFilename: opt(metadata.origFilename),
        coverArtSizes: opt(metadata.coverArtSizes)
      }
    })
    const txHash = result?.transactionHash ?? result?.transaction_hash
    if (txHash) console.log('[create-track] tx hash:', txHash)
    const trackId = result?.id ?? result?.track_id ?? result?.trackId
    return res.json({ success: true, trackId })
  } catch (e) {
    const status = e?.response?.status ?? 500
    let body = e?.message ?? 'Create track failed'
    try {
      if (e?.response) body = (await e.response.text()) || body
    } catch {}
    return res.status(status).json({ error: body })
  }
})

app.listen(PORT, () => {
  console.log(`Gated-upload server at http://localhost:${PORT}`)
  console.log(`  Signer: ${signerAddress}`)
  console.log(`  Geo allowed: ${allowedStr}`)
})
