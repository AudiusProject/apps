import { CollectionValues } from '@audius/common/schemas'
import { UploadFormState, UploadType } from '@audius/common/store'
import localforage from 'localforage'

import { TrackEditFormValues } from 'components/edit-track/types'

/**
 * Upload drafts live in IndexedDB on this device, one per user. Files
 * (audio, stems, artwork) are stored once under their own keys; the form
 * values reference them, so autosaving a metadata change doesn't rewrite
 * gigabytes of stems.
 */

const DRAFT_VERSION = 1
const FILE_REF = '__uploadDraftFile'

export type UploadDraftValues = TrackEditFormValues | CollectionValues

export type UploadDraft = {
  uploadType: UploadType
  values: UploadDraftValues
  savedAt: number
}

type StoredDraft = {
  version: number
  uploadType: UploadType
  values: unknown
  savedAt: number
  fileIds: string[]
}

let store: LocalForage | null = null
const getStore = () => {
  if (!store) {
    store = localforage.createInstance({
      name: 'audius',
      storeName: 'upload_drafts',
      driver: localforage.INDEXEDDB
    })
  }
  return store
}

const draftKey = (userId: number) => `draft:${userId}`
const fileKey = (userId: number, fileId: string) => `file:${userId}:${fileId}`

// Stable ids for blobs across saves, and which ones are already on disk.
const blobIds = new WeakMap<Blob, string>()
const savedFileKeys = new Set<string>()

// Run storage operations one at a time so overlapping autosaves and a
// clear can't interleave.
let queue: Promise<unknown> = Promise.resolve()
const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
  const next = queue.then(task, task)
  queue = next.catch(() => {})
  return next
}

const getBlobId = (blob: Blob) => {
  let id = blobIds.get(blob)
  if (!id) {
    id = crypto.randomUUID()
    blobIds.set(blob, id)
  }
  return id
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * Copies form values into something IndexedDB can hold: blobs become
 * references, and anything that isn't plain data (audio previews,
 * functions) is dropped.
 */
export const serializeDraftValues = (
  value: unknown,
  blobs: Map<string, Blob>
): unknown => {
  if (value instanceof Date) return value
  if (value instanceof Blob) {
    const id = getBlobId(value)
    blobs.set(id, value)
    return { [FILE_REF]: id }
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeDraftValues(item, blobs))
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      if (key === 'preview') continue
      const serialized = serializeDraftValues(item, blobs)
      if (serialized !== undefined) out[key] = serialized
    }
    return out
  }
  if (typeof value === 'function' || typeof value === 'symbol') return undefined
  if (value !== null && typeof value === 'object') return undefined
  return value
}

/**
 * Inverse of serializeDraftValues. Blob URLs from the previous session are
 * dead, so artwork urls are recreated and track previews rebuilt.
 */
export const deserializeDraftValues = (
  value: unknown,
  files: Map<string, Blob>
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => deserializeDraftValues(item, files))
  }
  if (!isPlainObject(value)) return value
  if (typeof value[FILE_REF] === 'string') {
    const blob = files.get(value[FILE_REF] as string)
    if (!blob) throw new Error('Upload draft is missing a file')
    blobIds.set(blob, value[FILE_REF] as string)
    return blob
  }
  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    out[key] = deserializeDraftValues(item, files)
  }
  if (out.file instanceof Blob) {
    if (typeof out.url === 'string' && out.url.startsWith('blob:')) {
      out.url = URL.createObjectURL(out.file)
    }
    if (typeof out.clientId === 'string' && typeof Audio !== 'undefined') {
      const audio = new Audio()
      audio.src = URL.createObjectURL(out.file)
      out.preview = audio
    }
  }
  return out
}

export const saveUploadDraft = (
  userId: number,
  uploadType: UploadType,
  values: UploadDraftValues
) => enqueue(() => writeDraft(userId, uploadType, values))

const writeDraft = async (
  userId: number,
  uploadType: UploadType,
  values: UploadDraftValues
) => {
  const db = getStore()
  const blobs = new Map<string, Blob>()
  const serialized = serializeDraftValues(values, blobs)

  for (const [id, blob] of blobs) {
    const key = fileKey(userId, id)
    if (savedFileKeys.has(key)) continue
    await db.setItem(key, blob)
    savedFileKeys.add(key)
  }

  const previous = await db.getItem<StoredDraft>(draftKey(userId))
  const draft: StoredDraft = {
    version: DRAFT_VERSION,
    uploadType,
    values: serialized,
    savedAt: Date.now(),
    fileIds: [...blobs.keys()]
  }
  await db.setItem(draftKey(userId), draft)

  // Drop files that are no longer referenced (removed stems, swapped art).
  const stale = previous?.fileIds.filter((id) => !blobs.has(id)) ?? []
  for (const id of stale) {
    const key = fileKey(userId, id)
    await db.removeItem(key)
    savedFileKeys.delete(key)
  }
}

export const loadUploadDraft = (userId: number) =>
  enqueue(() => readDraft(userId))

const readDraft = async (userId: number): Promise<UploadDraft | null> => {
  const db = getStore()
  const stored = await db.getItem<StoredDraft>(draftKey(userId))
  if (!stored) return null
  if (stored.version !== DRAFT_VERSION) {
    await removeDraft(userId)
    return null
  }
  try {
    const files = new Map<string, Blob>()
    for (const id of stored.fileIds) {
      const key = fileKey(userId, id)
      const blob = await db.getItem<Blob>(key)
      if (!blob) throw new Error('Upload draft is missing a file')
      files.set(id, blob)
      savedFileKeys.add(key)
    }
    return {
      uploadType: stored.uploadType,
      values: deserializeDraftValues(stored.values, files) as UploadDraftValues,
      savedAt: stored.savedAt
    }
  } catch (e) {
    console.warn('Discarding unreadable upload draft', e)
    await removeDraft(userId)
    return null
  }
}

export const clearUploadDraft = (userId: number) =>
  enqueue(() => removeDraft(userId))

const removeDraft = async (userId: number) => {
  const db = getStore()
  const prefix = fileKey(userId, '')
  const keys = await db.keys()
  for (const key of keys) {
    if (key === draftKey(userId) || key.startsWith(prefix)) {
      await db.removeItem(key)
      savedFileKeys.delete(key)
    }
  }
}

/** Rebuilds the upload page's form state from saved form values. */
export const draftToFormState = (draft: UploadDraft): UploadFormState => {
  switch (draft.uploadType) {
    case UploadType.ALBUM:
    case UploadType.PLAYLIST: {
      const values = draft.values as CollectionValues
      return {
        uploadType: draft.uploadType,
        tracks: values.tracks as any,
        metadata: values
      }
    }
    default: {
      const values = draft.values as TrackEditFormValues
      return {
        uploadType: draft.uploadType,
        tracks: values.tracks.map((track, i) => ({
          ...(track as any),
          metadata: values.trackMetadatas[i]
        }))
      }
    }
  }
}

/** Title to show for a draft: the collection or first track's name. */
export const getDraftTitle = (draft: UploadDraft) => {
  if ('trackMetadatas' in draft.values) {
    return draft.values.trackMetadatas[0]?.title ?? ''
  }
  return draft.values.playlist_name ?? ''
}
