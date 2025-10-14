import { useCallback, useEffect, useState, useRef } from 'react'

import { ThemeProvider } from '@audius/harmony'
import cn from 'classnames'
import { useParams, useSearchParams } from 'react-router-dom'
import { CSSTransition } from 'react-transition-group'

import '@audius/harmony/dist/harmony.css'

import {
  initTrackSessionStart,
  recordOpen,
  recordError
} from '../analytics/analytics'
import { ID_ROUTE, HASH_ID_ROUTE } from '../routes'
import {
  getCollection,
  getCollectionWithHashId,
  getTrack,
  getTrackWithHashId,
  getEntityEvents
} from '../util/BedtimeClient'
import { getArtworkUrl } from '../util/getArtworkUrl'
import { decodeHashId } from '../util/hashIds'
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

// How long to wait before we show the loading screen
const LOADING_WAIT_MSEC = 1
const DEFAULT_DOMINANT_COLOR = '#7e1bcc'

const RequestType = Object.seal({
  TRACK: 'track',
  COLLECTION: 'collection'
})

const pathComponentRequestTypeMap = {
  playlist: RequestType.COLLECTION,
  album: RequestType.COLLECTION,
  track: RequestType.TRACK
}

export const PlayerFlavor = Object.seal({
  CARD: 'card',
  COMPACT: 'compact',
  TINY: 'tiny'
})

// Attemps to parse a the window's url.
// Returns null if the URL scheme is invalid.
const getRequestDataFromURL = ({ path, type, flavor, matches }) => {
  // Get request type
  const requestType = pathComponentRequestTypeMap[type]
  if (!requestType) return null

  // Get the flavor
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

      // Validate the search params not null
      if ([id, ownerId].some((e) => e === null)) {
        return null
      }
      // Parse them as ints
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
    default:
      return null
  }
}

const App = (props) => {
  const params = useParams()
  const searchParams = useSearchParams()
  const [didError, setDidError] = useState(false) // General errors
  const [did404, setDid404] = useState(false) // 404s indicate content was deleted
  const [requestState, setRequestState] = useState(null) // Parsed request state
  const [isRetrying, setIsRetrying] = useState(false) // Currently retrying?

  const [tracksResponse, setTracksResponse] = useState(null)
  const [collectionsResponse, setCollectionsResponse] = useState(null)
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(false)
  const onGoingRequest = useRef(false)
  const [dominantColor, setDominantColor] = useState(null)

  useEffect(() => {
    if (didError) {
      recordError()
    }
  }, [didError])

  // Record this session with analytics
  useEffect(() => {
    initTrackSessionStart()
  }, [])

  // TODO: pull these out into separate functions?
  // Request metadata, compute dominant color on success.
  const requestMetadata = useCallback(async (request) => {
    onGoingRequest.current = true

    // Queue up the loading animation
    setTimeout(() => {
      if (onGoingRequest.current) {
        setShowLoadingAnimation(true)
      }
    }, LOADING_WAIT_MSEC)

    try {
      const { requestType } = request
      if (requestType === RequestType.TRACK) {
        let track
        if (request.hashId) {
          track = await getTrackWithHashId(request.hashId)
        } else {
          track = await getTrack(request.id)
        }

        if (!track) {
          setDid404(true)
          setTracksResponse(null)
        } else {
          const events = await getEntityEvents(track.id, 'track')
          setDid404(false)
          setTracksResponse({ ...track, events })
          recordOpen(
            decodeHashId(track.id),
            track.title,
            track.user.handle,
            stripLeadingSlash(track.permalink)
          )

          const artworkUrl = getArtworkUrl(track)
          // Set dominant color
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
      } else if (requestType === RequestType.COLLECTION) {
        let collection
        if (request.hashId) {
          collection = await getCollectionWithHashId(request.hashId)
        } else {
          collection = await getCollection(request.id)
        }

        if (!collection) {
          setDid404(true)
          setCollectionsResponse(null)
        } else {
          setDid404(false)
          setCollectionsResponse(collection)
          recordOpen(
            decodeHashId(collection.id),
            collection.playlistName,
            collection.user.handle,
            stripLeadingSlash(collection.permalink)
          )

          const artworkUrl = getArtworkUrl(collection)
          // Set dominant color
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
      setTracksResponse(null)
      setCollectionsResponse(null)
    }
  }, [])

  // Perform initial request
  useEffect(() => {
    const request = getRequestDataFromURL({
      path: props.path,
      // Type comes from the url if present, otherwise pull from the component props
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

  // Retries
  const retryRequestMetadata = async () => {
    if (isRetrying) return
    setIsRetrying(true)
    // If we don't have a valid request state
    // (e.g. URL params are invalid, just wait and then set it to retry failed)
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

  // The idea is to show nothing (null) until either we
  // get metadata back or we pass the loading threshold
  // and display the loading screen.
  const renderPlayerContainer = () => {
    if (didError) {
      return <Error onRetry={retryRequestMetadata} isRetrying={isRetrying} />
    }

    // Tiny variant renders its own deleted content
    if (did404) {
      return <DeletedContent flavor={requestState.playerFlavor} />
    }

    if (showLoadingAnimation && !isTiny) {
      return <Loading />
    }

    const mobileWebTwitter = isMobileWebTwitter(requestState?.isTwitter)

    if (requestState && dominantColor) {
      return (
        <CSSTransition
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
          <>
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
          </>
        </CSSTransition>
      )
    }

    return null
  }

  const renderPausePopover = () => {
    if (!requestState || (!tracksResponse && !collectionsResponse)) {
      return null
    }

    const artworkURL = getArtworkUrl(tracksResponse || collectionsResponse)
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
