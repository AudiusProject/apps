import { ID } from '~/models/Identifiers'

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

export function makeStableUid(kind: string, id: ID, source?: string) {
  return new Uid(kind, id, source, 0).toString()
}

export const makeKindId = (kind: string, id: ID | string | undefined) =>
  `${kind}-${id}`

export const getIdFromKindId = (kindId: string) => kindId.split('-')[1]

export const getNumericIdFromUid = (uid: string) =>
  parseInt(getIdFromKindId(uid).split(':')[1])

export const uuid = () => {
  const s: string[] = []
  const hexDigits = '0123456789abcdef'
  for (let i = 0; i < 36; i++) {
    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1)
  }
  s[14] = '4'
  s[19] = hexDigits.substr((parseInt(s[19], 16) & 0x3) | 0x8, 1)
  s[8] = s[13] = s[18] = s[23] = '-'

  const uuid = s.join('')
  return uuid
}
