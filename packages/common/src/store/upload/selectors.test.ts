import { describe, it, expect } from 'vitest'

import { CommonState } from '../commonStore'

import { getCombinedUploadPercentage } from './selectors'
import { ProgressState, ProgressStatus } from './types'

const makeTestCase = (testCase: ProgressState[]) => {
  return getCombinedUploadPercentage({
    upload: { uploadProgress: testCase }
  } as CommonState)
}

describe('upload selectors', () => {
  it('starts at 0%', () => {
    const zero = [
      {
        clientId: '1',
        image: {
          status: ProgressStatus.UPLOADING
        },
        audio: {
          status: ProgressStatus.UPLOADING,
          loaded: -100,
          total: 100
        },
        stems: []
      },
      {
        clientId: '2',
        image: {
          status: ProgressStatus.UPLOADING
        },
        audio: {
          status: ProgressStatus.UPLOADING,
          loaded: 0,
          total: 100
        },
        stems: []
      },
      {
        clientId: '3',
        image: {
          status: ProgressStatus.UPLOADING
        },
        audio: {
          status: ProgressStatus.UPLOADING,
          loaded: 0,
          total: 100
        },
        stems: []
      }
    ]
    expect(makeTestCase(zero)).toBe(0)
  })

  it('is at 50% when uploading finished', () => {
    const half = [
      {
        clientId: '1',
        image: {
          status: ProgressStatus.UPLOADING
        },
        audio: {
          status: ProgressStatus.UPLOADING,
          loaded: 100,
          total: 100
        },
        stems: []
      },
      {
        clientId: '2',
        image: {
          status: ProgressStatus.UPLOADING
        },
        audio: {
          status: ProgressStatus.UPLOADING,
          loaded: 100,
          total: 100
        },
        stems: []
      },
      {
        clientId: '3',
        image: {
          status: ProgressStatus.UPLOADING
        },
        audio: {
          status: ProgressStatus.UPLOADING,
          loaded: 100,
          total: 100
        },
        stems: []
      }
    ]
    expect(makeTestCase(half)).toBe(50)
  })

  it('is at 33% when two thirds transferred', () => {
    const twoThirdsUploaded = [
      {
        clientId: '1',
        image: {
          status: ProgressStatus.UPLOADING
        },
        audio: {
          status: ProgressStatus.UPLOADING,
          loaded: 50,
          total: 100
        },
        stems: []
      },
      {
        clientId: '2',
        image: {
          status: ProgressStatus.UPLOADING
        },
        audio: {
          status: ProgressStatus.UPLOADING,
          loaded: 50,
          total: 100
        },
        stems: []
      },
      {
        clientId: '3',
        image: {
          status: ProgressStatus.UPLOADING
        },
        audio: {
          status: ProgressStatus.UPLOADING,
          loaded: 100,
          total: 100
        },
        stems: []
      }
    ]
    expect(makeTestCase(twoThirdsUploaded)).toBe(33)
  })

  it('weights upload by file size', () => {
    const nearlyUploaded = [
      {
        clientId: '1',
        image: {
          status: ProgressStatus.UPLOADING
        },
        audio: {
          status: ProgressStatus.UPLOADING,
          loaded: 98,
          total: 98
        },
        stems: []
      },
      {
        clientId: '2',
        image: {
          status: ProgressStatus.UPLOADING
        },
        audio: {
          status: ProgressStatus.UPLOADING,
          loaded: 0,
          total: 1
        },
        stems: []
      },
      {
        clientId: '3',
        image: {
          status: ProgressStatus.UPLOADING
        },
        audio: {
          status: ProgressStatus.UPLOADING,
          loaded: 0,
          total: 1
        },
        stems: []
      }
    ]
    expect(makeTestCase(nearlyUploaded)).toBe(49)
  })

  it('includes stems tracks correctly', () => {
    const nearlyUploaded = [
      {
        clientId: '1',
        image: {
          status: ProgressStatus.UPLOADING
        },
        audio: {
          status: ProgressStatus.UPLOADING,
          loaded: 0,
          total: 1
        },
        stems: [
          {
            clientId: '1-1',
            image: {
              status: ProgressStatus.UPLOADING
            },
            audio: {
              status: ProgressStatus.UPLOADING,
              loaded: 1,
              total: 1
            },
            stems: []
          },
          {
            clientId: '1-2',
            image: {
              status: ProgressStatus.UPLOADING
            },
            audio: {
              status: ProgressStatus.UPLOADING,
              loaded: 1,
              total: 1
            },
            stems: []
          },
          {
            clientId: '1-3',
            image: {
              status: ProgressStatus.UPLOADING
            },
            audio: {
              status: ProgressStatus.UPLOADING,
              loaded: 1,
              total: 1
            },
            stems: []
          }
        ]
      },
      {
        clientId: '2',
        image: {
          status: ProgressStatus.UPLOADING
        },
        audio: {
          status: ProgressStatus.UPLOADING,
          loaded: 0,
          total: 1
        },
        stems: []
      },
      {
        clientId: '3',
        image: {
          status: ProgressStatus.UPLOADING
        },
        audio: {
          status: ProgressStatus.UPLOADING,
          loaded: 0,
          total: 1
        },
        stems: []
      }
    ]
    expect(makeTestCase(nearlyUploaded)).toBe(25)
  })

  it('caps to 100%', () => {
    const completed = [
      {
        clientId: '1',
        image: {
          status: ProgressStatus.UPLOADING
        },
        audio: {
          status: ProgressStatus.UPLOADING,
          loaded: 10,
          total: 1,
          transcode: 1.5
        },
        stems: []
      }
    ]
    expect(makeTestCase(completed)).toBe(100)
  })

  it('weights transcode by file size', () => {
    const completed = [
      {
        clientId: '1',
        image: {
          status: ProgressStatus.UPLOADING
        },
        audio: {
          status: ProgressStatus.UPLOADING,
          loaded: 99,
          total: 99,
          transcode: 1
        },
        stems: []
      },
      {
        clientId: '2',
        image: {
          status: ProgressStatus.UPLOADING
        },
        audio: {
          status: ProgressStatus.UPLOADING,
          loaded: 1,
          total: 1,
          transcode: 0
        },
        stems: []
      }
    ]
    expect(makeTestCase(completed)).toBe(99)
  })

  it('treats errors as completed', () => {
    const completed = [
      {
        clientId: '1',
        image: {
          status: ProgressStatus.UPLOADING
        },
        audio: {
          status: ProgressStatus.UPLOADING,
          loaded: 0,
          total: 100,
          transcode: 0
        },
        stems: []
      },
      {
        clientId: '2',
        image: {
          status: ProgressStatus.UPLOADING
        },
        audio: {
          status: ProgressStatus.ERROR,
          loaded: 0,
          total: 100,
          transcode: 0
        },
        stems: []
      }
    ]
    expect(makeTestCase(completed)).toBe(50)
  })
})
