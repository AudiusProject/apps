import { playbackSelectors, uploadSelectors } from '@audius/common/store'
import { createAction } from '@reduxjs/toolkit'
import { call, fork, select, takeEvery } from 'typed-redux-saga'

import { env } from 'services/env'
import {
  foregroundPollingDaemon,
  visibilityPollingDaemon
} from 'utils/sagaPollingDaemons'
const { getPlaying } = playbackSelectors
const { getIsUploading } = uploadSelectors

const checkGitSHA = createAction('RELOAD/CHECK_GIT_SHA')
const SHA_CHECK_MS = 60 * 60 * 1000 // Once every hour
let localSha: string | null = null

function* fetchCurrentGitSha() {
  const res = yield* call(fetch, `${window.location.origin}/gitsha.json`)
  const json = yield* call([res, res.json])
  if (typeof json?.git === 'string') {
    return json.git as string
  }
  throw new Error('Git SHA was not a string')
}

function* reloadIfNecessary() {
  console.debug('[reload] Checking git SHA...')
  if (env.ENVIRONMENT === 'development') {
    return
  }
  let fetchedSha: string | null = null
  try {
    fetchedSha = yield* call(fetchCurrentGitSha)
    if (localSha === null) {
      localSha = fetchedSha
    }
    const isPlaying = yield* select(getPlaying)
    const isUploading = yield* select(getIsUploading)
    const isLocalBundleCurrent = fetchedSha === localSha
    if (!isLocalBundleCurrent && !isPlaying && !isUploading) {
      console.warn('[reload] Bundle out of date. Reloading...', {
        fetchedSha,
        localSha
      })
      window.location.reload()
    } else {
      console.debug('[reload] SHAs match, bundle up to date.', {
        fetchedSha,
        localSha
      })
    }
  } catch (e) {
    console.error('[reload] Failed to check git SHA.', e, {
      fetchedSha,
      localSha
    })
  }
}

function* watchCheckGitSHA() {
  yield* takeEvery(checkGitSHA, reloadIfNecessary)
}

function* reloadDaemon() {
  yield* fork(visibilityPollingDaemon, checkGitSHA())
  yield* fork(foregroundPollingDaemon, checkGitSHA(), SHA_CHECK_MS)
}

export default function sagas() {
  return [reloadDaemon, watchCheckGitSHA]
}
