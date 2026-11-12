// Auto-increment the uid so that items with the

import { ID } from '~/models/Identifiers'

// same kind, id, and source have unique IDs
let count = 0

export class Uid {
  kind: string
  id: ID | string
  source: string | undefined
  count: number | string

  constructor(
    kind: string,
    id: ID | string,
    source?: string,
    count: number | string = 0
  ) {
    this.kind = kind
    this.id = id
    this.source = source
    this.count = count
  }

  static build(kind: string, id: ID | string, source?: string, addedCount = 0) {
    const count = Uid._getCount()
    return new Uid(kind, id, source, count + addedCount)
  }

  static fromString(uid: string) {
    const kind = Uid.getComponent(uid, 'kind')
    const id = parseInt(Uid.getComponent(uid, 'id'))
    const source = Uid.getComponent(uid, 'source')
    // TODO: we should probably parseInt here like id to avoid string | number type
    const count = Uid.getComponent(uid, 'count')
    return new Uid(kind, id, source, count)
  }

  static getComponent = (uid: string, componentName: string) => {
    const components = uid.split('-')
    const kind = components.find((component) =>
      component.startsWith(`${componentName}:`)
    )
    if (!kind) return ''
    return kind.substring(componentName.length + 1)
  }

  static makeCollectionSourceId = (source: string, collectionId: string) =>
    `${source}:collection:${collectionId}`

  static getCollectionId = (uid: string) => {
    const source = this.getComponent(uid, 'source')
    return source.split('collection:')[1] ?? null
  }

  toString = () => {
    return `kind:${this.kind}-id:${this.id}${
      this.source ? `-source:${this.source}` : ''
    }-count:${this.count}`
  }

  static _getCount() {
    count += 1
    return count
  }
}

export function makeUid(kind: string, id: ID, source?: string) {
  const uid = Uid.build(kind, id, source)
  return uid.toString()
}

/**
 * Builds a deterministic UID for a given (kind, id, source). Unlike `makeUid`,
 * this always returns the same string for the same inputs, so the UID is
 * stable across component remounts. Use this when a track appears at most
 * once in a single context (e.g., a section of unique recommended tracks),
 * so that the tile's UID continues to match the queue entry's UID after
 * remounting. Do not use for lineups that may contain the same track more
 * than once — there, each instance must be uniquely identified by its UID.
 */
export function makeStableUid(kind: string, id: ID, source?: string) {
  return new Uid(kind, id, source, 0).toString()
}

/**
 * A persistant identifier for a resource for re-use within a session.
 * Differs from a uid, which represents an instance.
 * @param kind
 * @param id
 */
export const makeKindId = (kind: string, id: ID | string | undefined) =>
  `${kind}-${id}`

/**
 * Gets the id from a kind id
 * @param kindId
 */
export const getIdFromKindId = (kindId: string) => kindId.split('-')[1]

/**
 * Gets the numeric id from a uid
 * @param uid
 */
export const getNumericIdFromUid = (uid: string) =>
  parseInt(getIdFromKindId(uid).split(':')[1])

export const uuid = () => {
  // https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript/873856#873856
  const s: string[] = []
  const hexDigits = '0123456789abcdef'
  for (let i = 0; i < 36; i++) {
    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1)
  }
  s[14] = '4' // bits 12-15 of the time_hi_and_version field to 0010
  s[19] = hexDigits.substr((parseInt(s[19], 16) & 0x3) | 0x8, 1) // bits 6-7 of the clock_seq_hi_and_reserved to 01
  s[8] = s[13] = s[18] = s[23] = '-'

  const uuid = s.join('')
  return uuid
}
