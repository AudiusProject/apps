import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import EventEmitter from 'events'
import path from 'path'

import { useCurrentUserId } from '@audius/common/api'
import { SquareSizes } from '@audius/common/models'
import type { Color } from '@audius/common/models'
import { modalsActions } from '@audius/common/store'
import type { ShareContent } from '@audius/common/store'
import { uuid } from '@audius/common/utils'
import type { Nullable } from '@audius/common/utils'
import { Id, OptionalId } from '@audius/sdk'
import * as RNFS from '@dr.pogodin/react-native-fs'
import { CreativeKit } from '@snapchat/snap-kit-react-native'
import type { FFmpegSession } from 'ffmpeg-kit-react-native'
import { FFmpegKit, FFmpegKitConfig, ReturnCode } from 'ffmpeg-kit-react-native'
import { AppState, Linking, Platform, View } from 'react-native'
import { check, PERMISSIONS, request, RESULTS } from 'react-native-permissions'
import type { ShareSingleOptions } from 'react-native-share'
import Share, { Social } from 'react-native-share'
import type ViewShot from 'react-native-view-shot'
import { useDispatch, useSelector } from 'react-redux'
import TikTokShare from 'tiktok-opensdk-react-native'

import { IconWaveform, Button } from '@audius/harmony-native'
import { LinearProgress, Text } from 'app/components/core'
import { useToast } from 'app/hooks/useToast'
import { make, track } from 'app/services/analytics'
import { audiusBackendInstance } from 'app/services/audius-backend-instance'
import { env } from 'app/services/env'
import { audiusSdk } from 'app/services/sdk/audius-sdk'
import { setVisibility } from 'app/store/drawers/slice'
import {
  getCancel,
  getPlatform,
  getProgressPercentage
} from 'app/store/share-to-story-progress/selectors'
import type { ShareToStoryPlatform } from 'app/store/share-to-story-progress/slice'
import {
  reset,
  setCancel,
  setPlatform,
  setProgress
} from 'app/store/share-to-story-progress/slice'
import { makeStyles } from 'app/styles'
import { EventNames } from 'app/types/analytics'
import { convertRGBToHex } from 'app/utils/convertRGBtoHex'
import {
  getDominantRgb,
  pickTwoMostDominantAndVibrant
} from 'app/utils/dominantColors'
import { isImageUriSource } from 'app/utils/image'
import { getTrackRoute } from 'app/utils/routes'

import { DrawerHeader } from '../core/DrawerHeader'
import { NativeDrawer } from '../drawer'
import { useTrackImage } from '../image/TrackImage'

import { messages } from './messages'

export const DEFAULT_IMAGE_URL =
  'https://download.audius.co/static-resources/preview-image.jpg'

const DEFAULT_DOMINANT_COLORS = ['000000', '434343']
const stickerLoadedEventEmitter = new EventEmitter()
const cancelRequestedEventEmitter = new EventEmitter()
const CANCEL_REQUESTED_EVENT = 'cancel' as const
const STICKER_LOADED_EVENT = 'loaded' as const

const START_EVENT_NAMES_MAP = {
  instagram: EventNames.SHARE_TO_IG_STORY,
  tiktok: EventNames.SHARE_TO_TIKTOK_VIDEO,
  snapchat: EventNames.SHARE_TO_SNAPCHAT
} as Record<
  ShareToStoryPlatform,
  | typeof EventNames.SHARE_TO_IG_STORY
  | typeof EventNames.SHARE_TO_TIKTOK_VIDEO
  | typeof EventNames.SHARE_TO_SNAPCHAT
>

const CANCELLED_EVENT_NAMES_MAP = {
  instagram: EventNames.SHARE_TO_IG_STORY_CANCELLED,
  tiktok: EventNames.SHARE_TO_TIKTOK_VIDEO_CANCELLED,
  snapchat: EventNames.SHARE_TO_SNAPCHAT_CANCELLED
} as Record<
  ShareToStoryPlatform,
  | typeof EventNames.SHARE_TO_IG_STORY_CANCELLED
  | typeof EventNames.SHARE_TO_TIKTOK_VIDEO_CANCELLED
  | typeof EventNames.SHARE_TO_SNAPCHAT_CANCELLED
>

const SUCCESS_EVENT_NAMES_MAP = {
  instagram: EventNames.SHARE_TO_IG_STORY_SUCCESS,
  tiktok: EventNames.SHARE_TO_TIKTOK_VIDEO_SUCCESS,
  snapchat: EventNames.SHARE_TO_SNAPCHAT_STORY_SUCCESS
} as Record<
  ShareToStoryPlatform,
  | typeof EventNames.SHARE_TO_IG_STORY_SUCCESS
  | typeof EventNames.SHARE_TO_TIKTOK_VIDEO_SUCCESS
  | typeof EventNames.SHARE_TO_SNAPCHAT_STORY_SUCCESS
>

const PLATFORM_APP_NAMES: Record<ShareToStoryPlatform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  snapchat: 'Snapchat'
}

const IOS_APP_SCHEMES: Record<ShareToStoryPlatform, string[]> = {
  instagram: ['instagram-stories://'],
  tiktok: ['tiktokopensdk://', 'snssdk1233://', 'snssdk1180://', 'tiktok://'],
  snapchat: ['snapchat://']
}

const isAppInstalled = async (platform: ShareToStoryPlatform) => {
  if (Platform.OS !== 'ios') return true
  const results = await Promise.all(
    IOS_APP_SCHEMES[platform].map((scheme) =>
      Linking.canOpenURL(scheme).catch(() => false)
    )
  )
  return results.some(Boolean)
}

const HANDOFF_TIMEOUT_MS = 8000
const FFMPEG_ATTEMPTS = 2
const ERROR_OUTPUT_LENGTH = 800

const waitForHandoff = (launch: Promise<unknown>) =>
  new Promise<void>((resolve, reject) => {
    let settled = false
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      subscription.remove()
      clearTimeout(timeout)
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') finish()
    })
    const timeout = setTimeout(
      () => finish(new Error('Share app did not open')),
      HANDOFF_TIMEOUT_MS
    )
    launch.then(
      () => finish(),
      (e) => finish(e instanceof Error ? e : new Error(String(e)))
    )
  })

const runWhenActive = (fn: () => void) => {
  if (AppState.currentState === 'active') {
    fn()
    return
  }
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      subscription.remove()
      fn()
    }
  })
}

const ERROR_EVENT_NAMES_MAP = {
  instagram: EventNames.SHARE_TO_IG_STORY_ERROR,
  tiktok: EventNames.SHARE_TO_TIKTOK_VIDEO_ERROR,
  snapchat: EventNames.SHARE_TO_SNAPCHAT_ERROR
} as Record<
  ShareToStoryPlatform,
  | typeof EventNames.SHARE_TO_IG_STORY_ERROR
  | typeof EventNames.SHARE_TO_TIKTOK_VIDEO_ERROR
  | typeof EventNames.SHARE_TO_SNAPCHAT_ERROR
>

export const useShareToStory = ({
  content,
  viewShotRef
}: {
  content: Nullable<ShareContent>
  viewShotRef: React.RefObject<ViewShot>
}) => {
  const { toast } = useToast()
  const dispatch = useDispatch()
  const cancelRef = useRef(false)
  const { data: userId } = useCurrentUserId()
  const [selectedPlatform, setSelectedPlatform] =
    useState<ShareToStoryPlatform | null>(null)

  const storyContent =
    content?.type === 'track' || content?.type === 'milestone' ? content : null
  const trackTitle = storyContent?.track.title
  const artistHandle = storyContent?.artist.handle

  const trackImage = useTrackImage({
    trackId: storyContent?.track.track_id,
    size: SquareSizes.SIZE_480_BY_480
  })
  const isStickerImageLoadedRef = useRef(false)
  const handleShareToStoryStickerLoad = useCallback(() => {
    isStickerImageLoadedRef.current = true
    stickerLoadedEventEmitter.emit(STICKER_LOADED_EVENT)
  }, [])

  const trackId = storyContent?.track.track_id ?? null
  useEffect(() => {
    if (trackId) {
      isStickerImageLoadedRef.current = false
    }
  }, [trackId])
  const trackImageUri =
    storyContent &&
    trackImage &&
    trackImage.source &&
    isImageUriSource(trackImage.source)
      ? trackImage.source.uri
      : DEFAULT_IMAGE_URL

  const captureStickerImage = useCallback(async () => {
    if (!isStickerImageLoadedRef.current) {
      await Promise.race([
        new Promise((resolve) =>
          stickerLoadedEventEmitter.once(STICKER_LOADED_EVENT, resolve)
        ),
        new Promise((resolve) => setTimeout(resolve, 5000))
      ])
      if (!isStickerImageLoadedRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
    let res: string | undefined
    if (viewShotRef?.current?.capture) {
      res = await viewShotRef.current.capture()
    }
    if (!res) {
      throw new Error('The sticker component did not load successfully.')
    }
    return res
  }, [viewShotRef])

  const toggleProgressDrawer = useCallback(
    (
      open: boolean,
      platform?: ShareToStoryPlatform,
      reopenShareModal = true
    ) => {
      if (open && platform) {
        dispatch(setPlatform(platform))
      }
      dispatch(setVisibility({ drawer: 'ShareToStoryProgress', visible: open }))
      if (!open && reopenShareModal) {
        dispatch(modalsActions.setVisibility({ modal: 'Share', visible: true }))
      }
    },
    [dispatch]
  )

  const cleanup = useCallback(
    (reopenShareModal = true) => {
      dispatch(reset())
      toggleProgressDrawer(false, undefined, reopenShareModal)
      setSelectedPlatform(null)
    },
    [dispatch, toggleProgressDrawer]
  )

  const handleError = useCallback(
    (
      platform: ShareToStoryPlatform,
      error: Error,
      name?: string,
      toastContent: string = messages.shareToStoryError
    ) => {
      console.error(error)
      toast({ content: toastContent, type: 'error' })
      track(
        make({
          eventName: ERROR_EVENT_NAMES_MAP[platform],
          title: trackTitle,
          artist: artistHandle,
          error: `${name ? `${name} - ` : ''}${error.message}`
        })
      )
      cleanup()
    },
    [artistHandle, cleanup, toast, trackTitle]
  )

  const cancelStory = useCallback(
    async (platform: ShareToStoryPlatform) => {
      cancelRef.current = true
      cancelRequestedEventEmitter.emit(CANCEL_REQUESTED_EVENT)
      await FFmpegKit.cancel()
      track(
        make({
          eventName: CANCELLED_EVENT_NAMES_MAP[platform],
          title: trackTitle,
          artist: artistHandle
        })
      )
      cleanup()
    },
    [artistHandle, cleanup, trackTitle]
  )

  const pasteToInstagramApp = useCallback(
    async (videoUri: string, stickerUri: string) => {
      const shareOptions: ShareSingleOptions = {
        backgroundVideo: videoUri,
        stickerImage: stickerUri,
        attributionURL: env.AUDIUS_URL,
        social: Social.InstagramStories,
        appId: env.FACEBOOK_APP_ID
      }
      await Share.shareSingle(shareOptions)
    },
    []
  )

  const pasteToSnapchatApp = useCallback(
    async (videoUri: string, stickerUri: string, trackPermalink: string) => {
      const videoContent = {
        content: {
          uri: videoUri
        },
        sticker: {
          uri: stickerUri,
          width: 264,
          height: 365,
          posX: 0.5,
          posY: 0.5,
          rotationDegreesInClockwise: 0,
          isAnimated: false
        },
        attachmentUrl: trackPermalink
      }
      await CreativeKit.shareVideo(videoContent)
    },
    []
  )

  const pasteToTikTokApp = useCallback(
    async (videoPath: string, platform: ShareToStoryPlatform) => {
      const pathToShare =
        Platform.OS === 'android' ? videoPath : `file://${videoPath}`
      await TikTokShare.share([pathToShare], false)
    },
    []
  )

  const generateStory = useCallback(
    async (platform: ShareToStoryPlatform) => {
      const sdk = await audiusSdk()

      if (storyContent) {
        if (!(await isAppInstalled(platform))) {
          toast({
            content: messages.shareToStoryAppNotInstalled(
              PLATFORM_APP_NAMES[platform]
            ),
            type: 'error'
          })
          track(
            make({
              eventName: ERROR_EVENT_NAMES_MAP[platform],
              title: storyContent.track.title,
              artist: storyContent.artist.handle,
              error: 'App not installed'
            })
          )
          cleanup()
          return
        }

        track(
          make({
            eventName: START_EVENT_NAMES_MAP[platform],
            title: storyContent.track.title,
            artist: storyContent.artist.handle
          })
        )

        dispatch(reset())
        cancelRef.current = false

        dispatch(setCancel(() => cancelStory(platform)))
        toggleProgressDrawer(true, platform)
        dispatch(setProgress(10))

        let stickerUri: string | undefined

        let rawDominantColorsResult: Color[] | string | undefined

        try {
          ;[rawDominantColorsResult, stickerUri] = await Promise.all([
            trackImageUri
              ? getDominantRgb(trackImageUri)
              : Promise.resolve(undefined),
            captureStickerImage()
          ])
        } catch (e) {
          handleError(
            platform,
            e,
            'Error at generate sticker + dominant colors step'
          )
          return
        }

        if (!stickerUri) {
          handleError(
            platform,
            new Error('Sticker screenshot unsuccessful'),
            'Error at generate sticker step (sticker undefined)'
          )
          return
        }

        const finalDominantColorsResult =
          rawDominantColorsResult &&
          Array.isArray(rawDominantColorsResult) &&
          rawDominantColorsResult.length > 0
            ? pickTwoMostDominantAndVibrant(rawDominantColorsResult).map(
                (c: Color) => convertRGBToHex(c)
              )
            : DEFAULT_DOMINANT_COLORS
        const dominantColorHex1 = finalDominantColorsResult[0]
        const dominantColorHex2 = finalDominantColorsResult[1]

        if (cancelRef.current) {
          cleanup()
          return
        }

        let backgroundSegment: string
        if (dominantColorHex2) {
          backgroundSegment = `gradients=s=540x960:x0=270:y0=2:x1=270:y1=958:c0=${dominantColorHex1}:c1=${dominantColorHex2}:duration=10:speed=0.042:rate=30`
        } else {
          backgroundSegment = `color=c=${dominantColorHex1}:s=540x960`
        }
        dispatch(setProgress(20))

        let streamMp3Url: string
        try {
          const { data, signature } =
            await audiusBackendInstance.signGatedContentRequest({
              sdk
            })
          streamMp3Url = await sdk.tracks.getTrackStreamUrl({
            trackId: Id.parse(storyContent.track.track_id),
            userId: OptionalId.parse(userId),
            userSignature: signature,
            userData: data
          })
        } catch (e) {
          handleError(platform, e, 'Error at resolve stream url step')
          return
        }
        const storyVideoPath = path.join(
          RNFS.TemporaryDirectoryPath,
          `storyVideo-${uuid()}.mp4`
        )
        const audioStartOffsetConfig =
          storyContent.track.duration && storyContent.track.duration >= 20
            ? '-ss 10 '
            : ''

        FFmpegKitConfig.enableStatisticsCallback((statistics) => {
          if (statistics.getTime() < 0) {
            return
          }
          const totalVideoDuration = 10000
          const loadedSoFar = statistics.getTime()
          const percentageLoaded = (loadedSoFar * 80) / totalVideoDuration
          dispatch(setProgress(Math.min(20 + percentageLoaded + 10, 100)))
        })
        const WAVEFORM_SEGMENT =
          "aformat=channel_layouts=mono:sample_rates=16000,showfreqs=s=18x120:rate=30:fscale=log:win_size=1024:averaging=2:colors=white,crop=18:64:0:0,scale=252:64:flags=neighbor,split[r][l];[l]hflip[lf];[lf][r]hstack,geq=r=255:g=255:b=255:a='if(lt(mod(X,14),4),0,max(alpha(X,Y),255*gte(Y,H-2))*0.85)',split[t][b];[b]vflip[bf];[t][bf]vstack"
        const thirdLayerSegment =
          platform === 'tiktok'
            ? '[vid];[1:v]scale=396:548[stkr];[vid][stkr]overlay=format=auto:x=72:y=200;'
            : ';'
        const stickerImageInput =
          platform === 'tiktok' ? ` -i ${stickerUri}` : ''
        let session: FFmpegSession | undefined
        for (let attempt = 1; attempt <= FFMPEG_ATTEMPTS; attempt++) {
          try {
            session = await FFmpegKit.execute(
              `-y ${audioStartOffsetConfig}-i ${streamMp3Url}${stickerImageInput} -filter_complex "${backgroundSegment}[bg];[0:a]${WAVEFORM_SEGMENT}[wave];[bg][wave]overlay=format=auto:x=(W-w)/2-2:y=H-h-80${thirdLayerSegment}[0:a]anull" -pix_fmt yuv420p -c:v libx264 -preset ultrafast -c:a aac -t 10 ${storyVideoPath}`
            )
          } catch (e) {
            handleError(platform, e, 'Error at FFmpeg step')
            return
          }
          if (cancelRef.current) {
            cleanup()
            return
          }
          if (ReturnCode.isSuccess(await session.getReturnCode())) break
          if (attempt === FFMPEG_ATTEMPTS) {
            const output = await session.getOutput()
            handleError(
              platform,
              new Error(output.slice(-ERROR_OUTPUT_LENGTH)),
              'Error at generate video background step'
            )
            return
          }
        }

        const videoUri = `file://${storyVideoPath}`
        let launch: Promise<unknown>
        if (platform === 'instagram') {
          launch = pasteToInstagramApp(videoUri, stickerUri)
        } else if (platform === 'snapchat') {
          launch = pasteToSnapchatApp(
            videoUri,
            `file://${stickerUri}`,
            encodeURI(getTrackRoute(storyContent.track, true))
          )
        } else {
          launch = pasteToTikTokApp(storyVideoPath, platform)
        }
        try {
          await waitForHandoff(launch)
        } catch (error) {
          const isTikTokLaunchError =
            error instanceof Error &&
            error.message === 'Failed to launch TikTok share'
          handleError(
            platform,
            error,
            'Error at share to app step',
            isTikTokLaunchError
              ? messages.shareToStoryAppNotInstalled(
                  PLATFORM_APP_NAMES[platform]
                )
              : undefined
          )
          return
        }

        track(
          make({
            eventName: SUCCESS_EVENT_NAMES_MAP[platform],
            title: storyContent.track.title,
            artist: storyContent.artist.handle
          })
        )

        const reopenShareModal = Platform.OS === 'ios'
        if (AppState.currentState === 'active') {
          setTimeout(() => runWhenActive(() => cleanup(reopenShareModal)), 1500)
        } else {
          runWhenActive(() => cleanup(reopenShareModal))
        }
      }
    },
    [
      trackImageUri,
      storyContent,
      toggleProgressDrawer,
      captureStickerImage,
      pasteToInstagramApp,
      pasteToSnapchatApp,
      handleError,
      cleanup,
      dispatch,
      cancelStory,
      userId,
      pasteToTikTokApp,
      toast
    ]
  )

  const handleShare = useCallback(
    async (platform: ShareToStoryPlatform) => {
      await Promise.race([
        generateStory(platform),
        new Promise<false>((resolve) =>
          cancelRequestedEventEmitter.once(CANCEL_REQUESTED_EVENT, () =>
            resolve(false)
          )
        )
      ])
    },
    [generateStory]
  )

  const handleShareToInstagramStory = useCallback(async () => {
    setSelectedPlatform('instagram')
    await handleShare('instagram')
  }, [handleShare])

  const handleShareToSnapchat = useCallback(async () => {
    setSelectedPlatform('snapchat')
    await handleShare('snapchat')
  }, [handleShare])

  const handleShareToTikTok = useCallback(async () => {
    if (Platform.OS === 'ios') {
      const isAddPhotoPermGrantedResult = await check(
        PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY
      )
      if (
        isAddPhotoPermGrantedResult === RESULTS.DENIED ||
        isAddPhotoPermGrantedResult === RESULTS.LIMITED
      ) {
        const permissionStatus = await request(
          PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY
        )
        if (permissionStatus !== RESULTS.GRANTED) {
          toast({
            content: messages.addToPhotoLibraryDenied,
            timeout: 8000,
            type: 'error'
          })
          return
        }
      } else if (
        isAddPhotoPermGrantedResult === RESULTS.BLOCKED ||
        isAddPhotoPermGrantedResult === RESULTS.UNAVAILABLE
      ) {
        toast({
          content: messages.addToPhotoLibraryBlocked,
          timeout: 12000,
          type: 'error'
        })
        return
      }
    }
    setSelectedPlatform('tiktok')
    await handleShare('tiktok')
  }, [handleShare, toast])

  return {
    handleShareToSnapchat,
    handleShareToStoryStickerLoad,
    handleShareToInstagramStory,
    handleShareToTikTok,
    selectedPlatform,
    cancelStory,
    stickerArtworkSource:
      storyContent && trackImage?.source != null && !trackImage.hasNoArtwork
        ? trackImage.source
        : undefined
  }
}

const useStyles = makeStyles(({ spacing }) => ({
  container: {
    paddingTop: spacing(4),
    paddingBottom: spacing(10),
    flexDirection: 'column',
    paddingHorizontal: spacing(4),
    alignItems: 'center'
  },
  subtitleText: {
    marginTop: spacing(4)
  },
  button: {
    marginTop: spacing(4)
  },
  progress: {
    marginTop: spacing(4),
    width: '100%',
    height: 24
  },
  progressBar: {
    height: 24
  },
  progressBarContainer: {
    borderRadius: 99
  }
}))

export const ShareToStoryProgressDrawer = () => {
  const styles = useStyles()
  const progressBarStyles = useMemo(
    () => ({
      root: styles.progressBarContainer,
      progress: styles.progressBar
    }),
    [styles.progressBar, styles.progressBarContainer]
  )
  const progress = useSelector(getProgressPercentage)
  const cancel = useSelector(getCancel)
  const platform = useSelector(getPlatform)
  const handleCancel = useCallback(() => {
    cancel?.()
  }, [cancel])

  let subtitle: string
  if (platform === 'instagram') {
    subtitle = messages.loadingInstagramStorySubtitle
  } else if (platform === 'snapchat') {
    subtitle = messages.loadingSnapchatSubtitle
  } else {
    subtitle = messages.loadingTikTokSubtitle
  }

  return (
    <NativeDrawer
      zIndex={10}
      drawerName='ShareToStoryProgress'
      onClose={handleCancel}
    >
      <View style={styles.container}>
        <DrawerHeader
          icon={IconWaveform}
          title={messages.loadingStoryModalTitle}
        />
        <View style={styles.progress}>
          <LinearProgress value={progress} styles={progressBarStyles} />
        </View>
        <Text weight='medium' fontSize={'large'} style={styles.subtitleText}>
          {subtitle}
        </Text>
        <Button
          fullWidth
          variant='secondary'
          onPress={handleCancel}
          style={styles.button}
        >
          {messages.cancel}
        </Button>
      </View>
    </NativeDrawer>
  )
}
