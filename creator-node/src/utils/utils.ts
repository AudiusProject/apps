import { recoverPersonalSignature } from 'eth-sig-util'
import { logger as genericLogger } from '../logging'

export type ValuesOf<T> = T[keyof T]

export function verifySignature(data: any, sig: any) {
  return recoverPersonalSignature({ data, sig })
}

export async function timeout(ms: number, log = true) {
  if (log) {
    genericLogger.debug(`starting timeout of ${ms}`)
  }
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generates a random number from [0, max)
 * @param {number} max the max random number. exclusive
 */
export function getRandomInt(max: number) {
  return Math.floor(Math.random() * max)
}

export function stringifyMap(map: Record<any, any>) {
  return JSON.stringify(Array.from(map.entries()))
}
