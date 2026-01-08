import {
  queryAccountUser,
  queryCurrentUserId,
  queryTracks
} from '@audius/common/api'
import { Feature, StemUploadWithFile } from '@audius/common/models'
import {
  TrackForUpload,
  TrackMetadataForUpload,
  UploadType,
  confirmTransaction,
  uploadActions
} from '@audius/common/store'
import { waitForAccount } from '@audius/common/utils'
import { EntityManagerAction } from '@audius/sdk'
import camelcaseKeys from 'camelcase-keys'
import { expectSaga } from 'redux-saga-test-plan'
import { call, getContext } from 'redux-saga-test-plan/matchers'
import { all, fork } from 'typed-redux-saga'
import { beforeAll, describe, expect, it, vitest } from 'vitest'

import { reportToSentry } from 'store/errors/reportToSentry'
import { waitForWrite } from 'utils/sagaHelpers'

import { addPremiumMetadata } from './sagaHelpers'
import uploadSagas, {
  deleteTracks,
  handleUploads,
  uploadCollection,
  uploadMultipleTracks
} from './sagas'

function* saga() {
  yield* all(uploadSagas().map(fork))
}

const emptyMetadata: TrackMetadataForUpload = {
  artwork: null,
  blocknumber: 0,
  is_delete: false,
  track_id: 0,
  created_at: '',
  create_date: null,
  isrc: null,
  iswc: null,
  credits_splits: null,
  description: null,
  followee_reposts: [],
  followee_saves: [],
  genre: '',
  has_current_user_reposted: false,
  has_current_user_saved: false,
  license: null,
  mood: null,
  play_count: 0,
  owner_id: 0,
  release_date: null,
  repost_count: 0,
  save_count: 0,
  comment_count: 0,
  tags: null,
  title: '',
  track_segments: [],
  cover_art: null,
  cover_art_sizes: null,
  is_scheduled_release: false,
  is_unlisted: false,
  is_available: false,
  is_stream_gated: false,
  stream_conditions: null,
  is_download_gated: false,
  download_conditions: null,
  access: {
    stream: false,
    download: false
  },
  permalink: '',
  track_cid: null,
  orig_file_cid: null,
  orig_filename: null,
  is_downloadable: false,
  is_original_available: false,
  remix_of: null,
  duration: 0,
  updated_at: '',
  is_owned_by_user: false,
  cover_original_song_title: null,
  cover_original_artist: null
}

describe('upload', () => {
  beforeAll(() => {
    vitest.spyOn(global.console, 'debug').mockImplementation(() => {})
    vitest.spyOn(global.console, 'error').mockImplementation(() => {})
  })

  it('uploads single track as non-collection', () => {
    const testTrack: TrackForUpload = {
      file: new File(['abcdefghijklmnopqrstuvwxyz'], 'test'),
      metadata: emptyMetadata
    }
    return (
      expectSaga(saga)
        .dispatch(
          uploadActions.uploadTracks({
            uploadType: UploadType.INDIVIDUAL_TRACK,
            tracks: [testTrack]
          })
        )
        .provide([
          [call.fn(waitForWrite), undefined],
          [call.fn(queryAccountUser), {}],
          [call.fn(queryCurrentUserId), 12345],
          [call.fn(uploadMultipleTracks), undefined],
          [call.fn(addPremiumMetadata), testTrack],
          [
            getContext('queryClient'),
            {
              setQueryData: () => {},
              invalidateQueries: () => {}
            }
          ]
        ])
        // Assertions
        // Assert that we format the tracks for premium conditions
        .call.like({ fn: addPremiumMetadata })
        // Ensure that we call uploadMultipleTracks
        .call.like({ fn: uploadMultipleTracks, args: [[testTrack]] })
        // Ensure that this isn't treated as a collection
        .not.call.like({ fn: uploadCollection })
        .run()
    )
  })

  it('uploads stems with track', () => {
    const stemMetadata: TrackMetadataForUpload = emptyMetadata
    const stem: StemUploadWithFile = {
      file: new File(['abcdefghijklmnopqrstuvwxyz'], 'test'),
      metadata: stemMetadata,
      category: null,
      allowDelete: false,
      allowCategorySwitch: false
    }
    const testTrack: TrackForUpload = {
      file: new File(['abcdefghijklmnopqrstuvwxyz'], 'test'),
      metadata: {
        ...emptyMetadata,
        stems: [stem]
      }
    }

    let i = 1
    return (
      expectSaga(saga)
        .dispatch(
          uploadActions.uploadTracks({
            uploadType: UploadType.INDIVIDUAL_TRACK,
            tracks: [testTrack]
          })
        )
        .provide([
          [call.fn(waitForWrite), undefined],
          [call.fn(queryAccountUser), {}],
          [call.fn(queryCurrentUserId), 12345],
          [call.fn(addPremiumMetadata), testTrack.metadata],
          [
            getContext('audiusSdk'),
            () => {
              return {
                tracks: {
                  generateTrackId: () => i++,
                  uploadTrackFiles: () => testTrack.metadata,
                  writeTrackToChain: () => ({
                    trackId: '7eP5n'
                  })
                }
              }
            }
          ],
          [
            getContext('queryClient'),
            {
              setQueryData: () => {},
              invalidateQueries: () => {}
            }
          ],
          [call.fn(confirmTransaction), true],
          [call.fn(waitForAccount), undefined],
          [call.fn(queryTracks), [testTrack]]
        ])
        // Assertions
        // Uploaded track
        .put.like({
          action: {
            type: 'UPLOADED',
            payload: { trackIndex: 0, stemIndex: null }
          }
        })
        // Uploaded stem
        .put.like({
          action: {
            type: 'UPLOADED',
            payload: { trackIndex: 0, stemIndex: 0 }
          }
        })
        // Published stem
        .put.like({
          action: {
            type: 'PUBLISHED',
            payload: { trackIndex: 0, stemIndex: 0 }
          }
        })
        // Published track
        .put.like({
          action: {
            type: 'PUBLISHED',
            payload: { trackIndex: 0, stemIndex: null }
          }
        })
        // Succeeds upload
        .put.actionType(uploadActions.UPLOAD_TRACKS_SUCCEEDED)
        .silentRun()
    )
  })

  it('does not upload parent if stem fails and deletes orphaned stems', () => {
    const stem1: StemUploadWithFile = {
      file: new File(['abcdefghijklmnopqrstuvwxyz'], 'test stem1'),
      metadata: { ...emptyMetadata, track_id: 2, title: 'stem1' },
      category: null,
      allowDelete: false,
      allowCategorySwitch: false
    }
    const stem2: StemUploadWithFile = {
      file: new File(['abcdefghijklmnopqrstuvwxyz'], 'test stem2'),
      metadata: { ...emptyMetadata, track_id: 3, title: 'stem2' },
      category: null,
      allowDelete: false,
      allowCategorySwitch: false
    }
    const testTrack: TrackForUpload = {
      file: new File(['abcdefghijklmnopqrstuvwxyz'], 'test'),
      metadata: {
        ...emptyMetadata,
        track_id: 1,
        title: 'parent',
        stems: [stem1, stem2]
      }
    }
    const mockError = new Error('Publish failed')

    const mockWriteTrackUploadToChain = vitest.fn()
    // Mock successful first stem publish
    mockWriteTrackUploadToChain.mockResolvedValueOnce({
      trackId: 'ML51L'
    })
    // Mock failure for second stem
    mockWriteTrackUploadToChain.mockRejectedValueOnce(mockError)

    // Mock successful uploads
    const mockUploadTrackFiles = vitest.fn()
    mockUploadTrackFiles.mockReturnValueOnce(camelcaseKeys(testTrack.metadata))
    mockUploadTrackFiles.mockReturnValueOnce(camelcaseKeys(stem1.metadata))
    mockUploadTrackFiles.mockReturnValueOnce(camelcaseKeys(stem2.metadata))

    return (
      expectSaga(handleUploads, { tracks: [testTrack], kind: 'tracks' })
        .provide([
          [call.fn(waitForWrite), undefined],
          [call.fn(queryAccountUser), {}],
          [call.fn(queryCurrentUserId), 12345],
          [call.fn(addPremiumMetadata), testTrack.metadata],
          [
            getContext('audiusSdk'),
            () => {
              return {
                tracks: {
                  uploadTrackFiles: mockUploadTrackFiles,
                  writeTrackToChain: mockWriteTrackUploadToChain
                }
              }
            }
          ],
          [
            getContext('queryClient'),
            {
              setQueryData: () => {},
              invalidateQueries: () => {}
            }
          ],
          [call.fn(confirmTransaction), true],
          [call.fn(waitForAccount), undefined],
          [call.fn(queryTracks), [testTrack.metadata]],
          [call.fn(deleteTracks), undefined]
        ])
        // Reports to sentry
        .call(reportToSentry, {
          name: 'UploadWorker',
          error: mockError,
          additionalInfo: {
            trackId: 3,
            metadata: stem2.metadata,
            fileSize: stem2.file.size,
            trackIndex: 0,
            stemIndex: 1,
            trackCount: 1,
            stemCount: 2,
            phase: 'publish',
            kind: 'tracks'
          },
          feature: Feature.Upload
        })
        // Fails the parent too
        .call.like({
          fn: reportToSentry,
          args: [
            {
              name: 'UploadWorker',
              additionalInfo: {
                trackId: 1,
                metadata: testTrack.metadata,
                fileSize: testTrack.file.size,
                trackIndex: 0,
                stemIndex: null,
                trackCount: 1,
                stemCount: 2,
                phase: 'publish',
                kind: 'tracks'
              },
              feature: Feature.Upload
            }
          ]
        })
        // Delete the stem that was successfully published
        .call(deleteTracks, [2])
        // Expect the saga to throw since no tracks succeeded
        .throws(Error)
        .silentRun()
        .then(() => {
          // Never published the parent track
          expect(mockWriteTrackUploadToChain).not.toBeCalledWith(
            testTrack.metadata,
            EntityManagerAction.CREATE,
            1
          )
        })
    )
  })
})
