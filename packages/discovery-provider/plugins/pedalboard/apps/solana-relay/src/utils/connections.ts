import { Connection } from '@solana/web3.js'

import { config } from '../config'

export const normalizeEp = (ep: string): string => {
  if (ep.startsWith('http')) {
    return ep
  } else {
    const mep: string = Array.from(ep)
      .filter((c, i) => i % Math.floor(ep.length / 6) !== 0)
      .join('')
    return Buffer.from(mep, 'base64').toString('utf-8')
  }
}

export const connections = config.solanaEndpoints.map(
  (endpoint) => new Connection(normalizeEp(endpoint))
)

export const getConnection = (): Connection => {
  const randomIndex = Math.floor(Math.random() * connections.length)
  return connections[randomIndex]
}
