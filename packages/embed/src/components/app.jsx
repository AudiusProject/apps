import { useCallback, useEffect, useState, useRef } from 'react'

import { ThemeProvider } from '@audius/harmony'
import cn from 'classnames'
import { useParams, useSearchParams } from 'react-router'
import { CSSTransition } from 'react-transition-group'

import '@audius/harmony/dist/harmony.css'

import { initAnalytics } from '../analytics/analytics'
import { ID_ROUTE, HASH_ID_ROUTE, PERMALINK_ROUTE } from '../routes'
import {
  getCollection,
  getCollectionWithHashId,
  getCollectionByPermalink,
  getTrack,
  getTrackWithHashId,
  getTrackByPermalink,
  getEntityEvents
} from '../util/BedtimeClient'
import { getArtworkUrl } from '../util/getArtworkUrl'
import { getDominantColor } from '../util/image/imageProcessingUtil'
import { isMobileWebTwitter } from '../util/isMobileWebTwitter'
import { logError } from '../util/logError'
import { shadeColor } from '../util/shadeColor'
import { stripLeadingSlash } from '../util/stringUtil'

import styles from './App.module.css'
import transitions from './AppTransitions.module.css'
import { CardContextProvider } from './card/Card'
import CollectionPlayerContainer from './collection/CollectionPlayerContainer'
import DeletedContent from './deleted/DeletedContent'
import Error from './error/Error'
import Loading from './loading/Loading'
import PausePopover from './pausedpopover/PausePopover'
import { PauseContextProvider } from './pausedpopover/PauseProvider'
import { ToastContextProvider } from './toast/ToastContext'
import TrackPlayerContainer from './track/TrackPlayerContainer'

const LOADING_WAIT_MSEC = 1
const DEFAULT_DOMINANT_COLOR = '#7e1bcc'

const RequestType = Object.seal({
  TRACK: 'track',
  ALBUM: 'album',
  PLAYLIST: 'playlist'
})

const pathComponentRequestTypeMap = {
  playlist: RequestType.PLAYLIST,
  album: RequestType.ALBUM,
  track: RequestType.TRACK
}

export const PlayerFlavor = Object.seal({
  CARD: 'card',
  COMPACT: 'compact',
  TINY: 'tiny'
})

const getRequestDataFromURL = ({ path, type, flavor, matches }) => {
  const requestType = pathComponentRequestTypeMap[type]
  if (!requestType) return null

  let playerFlavor
  if (flavor === PlayerFlavor.CARD) {
    playerFlavor = PlayerFlavor.CARD
  } else if (flavor === PlayerFlavor.COMPACT) {
    playerFlavor = PlayerFlavor.COMPACT
  } else if (flavor === PlayerFlavor.TINY) {
    playerFlavor = PlayerFlavor.TINY
  } else {
    playerFlavor = PlayerFlavor.CARD
  }

  switch (path) {
    case ID_ROUTE: {
      const { id, ownerId, isTwitter } = matches

      if ([id, ownerId].some((e) => e === null)) {
        return null
      }
      const [intId, intOwnerId] = [parseInt(id, 10), parseInt(ownerId, 10)]
      if (isNaN(intId) || isNaN(intOwnerId)) {
        return null
      }

      return {
        requestType,
        playerFlavor,
        id: intId,
        ownerId: intOwnerId,
        isTwitter
      }
    }
    case HASH_ID_ROUTE: {
      const { hashId, isTwitter } = matches

      return {
        requestType,
        playerFlavor,
        hashId,
        isTwitter
      }
    }
    case PERMALINK_ROUTE: {
      const { handle, slug, isTwitter } = matches

      if (!handle || !slug) {
        return null
      }

      return {
        requestType,
        playerFlavor,
        handle,
        slug,
        isTwitter
      }
    }
    default:
      return null
  }
}

const App = (props) => {
  const params = useParams()
  const searchParams = useSearchParams()
  const [didError, setDidError] = useState(false)
  const [did404, setDid404] = useState(false)
  const [isUnavailable, setIsUnavailable] = useState(false)
  const [requestState, setRequestState] = useState(null)
  const [isRetrying, setIsRetrying] = useState(false)

  const [tracksResponse, setTracksResponse] = useState(null)
  const [collectionsResponse, setCollectionsResponse] = useState(null)
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(false)
  const onGoingRequest = useRef(false)
  const [dominantColor, setDominantColor] = useState(null)
  const playerContainerRef = useRef(null)

  useEffect(() => {
    initAnalytics()
  }, [])

  const requestMetadata = useCallback(async (request) => {
    onGoingRequest.current = true

    setTimeout(() => {
      if (onGoingRequest.current) {
        setShowLoadingAnimation(true)
      }
    }, LOADING_WAIT_MSEC)

    try {
      const { requestType } = request
      if (requestType === RequestType.TRACK) {
        let track
        if (request.handle && request.slug) {
          track = await getTrackByPermalink(request.handle, request.slug)
        } else if (request.hashId) {
          track = await getTrackWithHashId(request.hashId)
        } else {
          track = await getTrack(request.id)
        }

        if (!track) {
          setDid404(true)
          setIsUnavailable(false)
          setTracksResponse(null)
        } else if (track.isStreamable === false) {
          setDid404(true)
          setIsUnavailable(true)
          setTracksResponse(null)
        } else {
          const events = await getEntityEvents(track.id, 'track')
          setDid404(false)
          setIsUnavailable(false)
          setTracksResponse({ ...track, events })

          const artworkUrl = await getArtworkUrl(track)
          let color
          if (artworkUrl) {
            try {
              color = await getDominantColor(artworkUrl)
            } catch (e) {
              color = DEFAULT_DOMINANT_COLOR
            }
          } else {
            color = DEFAULT_DOMINANT_COLOR
          }

          setDominantColor({ primary: color })
        }
      } else if (
        requestType === RequestType.ALBUM ||
        requestType === RequestType.PLAYLIST
      ) {
        let collection
        if (request.handle && request.slug) {
          collection = await getCollectionByPermalink(
            request.handle,
            request.slug,
            requestType
          )
        } else if (request.hashId) {
          collection = await getCollectionWithHashId(request.hashId)
        } else {
          collection = await getCollection(request.id)
        }

        if (!collection) {
          setDid404(true)
          setIsUnavailable(false)
          setCollectionsResponse(null)
        } else {
          setDid404(false)
          setIsUnavailable(false)
          setCollectionsResponse(collection)

          const artworkUrl = await getArtworkUrl(collection)
          let color
          if (artworkUrl) {
            try {
              color = await getDominantColor(artworkUrl)
            } catch (e) {
              color = DEFAULT_DOMINANT_COLOR
            }
          } else {
            color = DEFAULT_DOMINANT_COLOR
          }
          setDominantColor({
            primary: color,
            secondary: shadeColor(color, -20)
          })
        }
      }

      onGoingRequest.current = false
      setDidError(false)
      setShowLoadingAnimation(false)
    } catch (e) {
      onGoingRequest.current = false
      logError(`Got error: ${e.message}`)
      setDidError(true)
      setShowLoadingAnimation(false)
      setDid404(false)
      setIsUnavailable(false)
      setTracksResponse(null)
      setCollectionsResponse(null)
    }
  }, [])

  useEffect(() => {
    const request = getRequestDataFromURL({
      path: props.path,
      type: params.type || props.type,
      flavor: searchParams[0]?.get('flavor') ?? undefined,
      matches: params
    })
    if (!request) {
      setDidError(true)
      return
    }
    setRequestState(request)
    requestMetadata(request)
    // TODO: Fix these deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const retryRequestMetadata = async () => {
    if (isRetrying) return
    setIsRetrying(true)
    if (!requestState) {
      setTimeout(() => {
        setIsRetrying(false)
      }, 1500)
      return
    }

    await requestMetadata(requestState)
    setIsRetrying(false)
  }

  const isCompact =
    requestState &&
    requestState.playerFlavor &&
    requestState.playerFlavor === PlayerFlavor.COMPACT
  const isTiny =
    requestState &&
    requestState.playerFlavor &&
    requestState.playerFlavor === PlayerFlavor.TINY
  const mobileWebTwitter = isMobileWebTwitter(requestState?.isTwitter)

  const renderPlayerContainer = () => {
    if (didError) {
      return <Error onRetry={retryRequestMetadata} isRetrying={isRetrying} />
    }

    if (did404) {
      return (
        <DeletedContent
          flavor={requestState.playerFlavor}
          isUnavailable={isUnavailable}
        />
      )
    }

    if (showLoadingAnimation && !isTiny) {
      return <Loading />
    }

    const mobileWebTwitter = isMobileWebTwitter(requestState?.isTwitter)
    const isCard = requestState?.playerFlavor === PlayerFlavor.CARD

    if (requestState && dominantColor) {
      return (
        <CSSTransition
          nodeRef={playerContainerRef}
          classNames={{
            appear: mobileWebTwitter
              ? transitions.appearMobileWebTwitter
              : transitions.appear,
            appearActive: mobileWebTwitter
              ? transitions.appearActiveMobileWebTwitter
              : transitions.appearActive
          }}
          appear
          in
          timeout={1000}
        >
          <div
            ref={playerContainerRef}
            style={{
              flex: 1,
              width: '100%',
              minWidth: 0,
              minHeight: 0,
              overflow: 'hidden',
              display: isCard ? 'flex' : 'block',
              justifyContent: isCard ? 'center' : undefined,
              alignItems: isCard ? 'center' : undefined
            }}
          >
            {!tracksResponse ? null : (
              <TrackPlayerContainer
                track={tracksResponse}
                flavor={requestState.playerFlavor}
                isTwitter={requestState.isTwitter}
                backgroundColor={dominantColor.primary}
              />
            )}
            {!collectionsResponse ? null : (
              <CollectionPlayerContainer
                collection={collectionsResponse}
                flavor={requestState.playerFlavor}
                isTwitter={requestState.isTwitter}
                backgroundColor={dominantColor.primary}
                rowBackgroundColor={dominantColor.secondary}
              />
            )}
          </div>
        </CSSTransition>
      )
    }

    return null
  }

  const [pausePopoverArtworkURL, setPausePopoverArtworkURL] = useState(null)
  useEffect(() => {
    const response = tracksResponse || collectionsResponse
    if (response) {
      getArtworkUrl(response).then((url) => setPausePopoverArtworkURL(url))
    }
  }, [tracksResponse, collectionsResponse])

  const renderPausePopover = () => {
    if (!requestState || (!tracksResponse && !collectionsResponse)) {
      return null
    }

    const artworkURL = pausePopoverArtworkURL
    const artworkClickURL =
      tracksResponse?.permalink || collectionsResponse?.permalink
        ? stripLeadingSlash(
            tracksResponse?.permalink || collectionsResponse?.permalink
          )
        : null
    const listenOnAudiusURL = artworkClickURL
    const flavor = requestState.playerFlavor
    const isTrack = !!tracksResponse
    return (
      <PausePopover
        artworkURL={artworkURL}
        artworkClickURL={artworkClickURL}
        listenOnAudiusURL={listenOnAudiusURL}
        flavor={flavor}
        isMobileWebTwitter={mobileWebTwitter}
        streamConditions={
          tracksResponse?.streamConditions ||
          collectionsResponse?.streamConditions
        }
        isTrack={isTrack}
      />
    )
  }

  useEffect(() => {
    if (requestState?.isTwitter) {
      document.body.style.backgroundColor = '#ffffff'
    }
  }, [requestState])

  return (
    <div
      id='app'
      className={cn(
        styles.app,
        { [styles.compactApp]: isCompact },
        {
          [styles.twitter]:
            requestState && requestState.isTwitter && !mobileWebTwitter
        }
      )}
    >
      <ThemeProvider theme='day'>
        <ToastContextProvider>
          <PauseContextProvider>
            <CardContextProvider>
              {renderPausePopover()}
              {renderPlayerContainer()}
            </CardContextProvider>
          </PauseContextProvider>
        </ToastContextProvider>
      </ThemeProvider>
    </div>
  )
}

export default App
