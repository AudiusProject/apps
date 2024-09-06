import { transformAndCleanList } from '@audius/common/adapters'
import { HashId } from '@audius/common/models'
import { AudiusBackend, FeatureFlags } from '@audius/common/services'
import {
  reactionsUIActions,
  reactionsUISelectors,
  reactionsMap,
  getReactionFromRawValue,
  getContext,
  ReactionTypes,
  accountSelectors,
  getSDK
} from '@audius/common/store'
import {
  encodeHashId,
  getErrorMessage,
  isResponseError,
  removeNullable
} from '@audius/common/utils'
import { AudiusSdk } from '@audius/sdk'
import { call, takeEvery, all, put, select } from 'typed-redux-saga'

import { waitForWrite } from 'utils/sagaHelpers'

const { getUserId } = accountSelectors
const { fetchReactionValues, setLocalReactionValues, writeReactionValue } =
  reactionsUIActions
const { makeGetReactionForSignature } = reactionsUISelectors

type SubmitReactionConfig = {
  reactedTo: string
  reactionValue: ReactionTypes | null
  audiusBackend: AudiusBackend
  audiusSdk: AudiusSdk
  userId: string
  useDiscoveryReactions: Promise<boolean>
}

type SubmitReactionResponse = { success: boolean; error: any }

const submitReaction = async ({
  reactedTo,
  reactionValue,
  audiusBackend,
  audiusSdk,
  userId,
  useDiscoveryReactions
}: SubmitReactionConfig): Promise<SubmitReactionResponse> => {
  try {
    if (await useDiscoveryReactions) {
      await audiusSdk.users.sendTipReaction({
        userId,
        metadata: {
          reactedTo,
          reactionValue: reactionValue || '😍'
        }
      })
      return { success: true, error: undefined }
    } else {
      const libs = await audiusBackend.getAudiusLibs()
      return libs.Reactions.submitReaction({
        reactedTo,
        reactionValue: reactionValue ? reactionsMap[reactionValue] : 0
      })
    }
  } catch (err) {
    const errorMessage = getErrorMessage(err)
    console.error(errorMessage)
    return { success: false, error: errorMessage }
  }
}

function* fetchReactionValuesAsync({
  payload
}: ReturnType<typeof fetchReactionValues>) {
  const sdk = yield* getSDK()
  // Fetch reactions
  // TODO: https://linear.app/audius/issue/PAY-3383/fix-bulk-reactions-endpoint
  const reactions = yield* all(
    payload.entityIds.map((id) =>
      call(async () => {
        try {
          const { data = [] } = await sdk.full.reactions.bulkGetReactions({
            reactedToIds: [id]
          })
          return transformAndCleanList(data, (item) => ({
            ...item,
            reactionValue: parseInt(item.reactionValue),
            senderUserId: HashId.parse(item.senderUserId)
          }))[0]
        } catch (e) {
          if (isResponseError(e) && e.response.status === 404) {
            return null
          }
          throw e
        }
      })
    )
  )
  // Add them to the store
  // Many of these reactions may be null (i.e. entity not reacted to), ignore them
  const toUpdate = reactions
    .filter(removeNullable)
    .map(({ reactedTo, reactionValue }) => ({
      reaction: getReactionFromRawValue(reactionValue), // this may be null if reaction state is 0 (unsent)
      entityId: reactedTo
    }))

  yield put(setLocalReactionValues({ reactions: toUpdate }))
}

function* writeReactionValueAsync({
  payload
}: ReturnType<typeof writeReactionValue>) {
  const { entityId, reaction } = payload
  if (!reaction) {
    return
  }

  // If we're toggling a reaction, set it to null
  const existingReaction = yield* select(makeGetReactionForSignature(entityId))
  const newReactionValue = existingReaction === reaction ? null : reaction

  yield put(
    setLocalReactionValues({
      reactions: [{ reaction: newReactionValue, entityId }]
    })
  )

  const audiusBackend = yield* getContext('audiusBackendInstance')
  const audiusSdk = yield* getContext('audiusSdk')
  const sdk = yield* call(audiusSdk)

  const getFeatureEnabled = yield* getContext('getFeatureEnabled')
  const useDiscoveryReactions = getFeatureEnabled(
    FeatureFlags.DISCOVERY_TIP_REACTIONS
  )

  yield* waitForWrite()
  const accountId = yield* select(getUserId)
  const userId = encodeHashId(accountId!)

  yield* call(submitReaction, {
    reactedTo: entityId,
    reactionValue: newReactionValue,
    audiusBackend,
    audiusSdk: sdk,
    userId,
    useDiscoveryReactions
  })
}

function* watchFetchReactionValues() {
  yield* takeEvery(fetchReactionValues.type, fetchReactionValuesAsync)
}

function* watchWriteReactionValues() {
  yield* takeEvery(writeReactionValue.type, writeReactionValueAsync)
}

const sagas = () => {
  return [watchFetchReactionValues, watchWriteReactionValues]
}

export default sagas
