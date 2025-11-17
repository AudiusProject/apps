import { MouseEventHandler, useEffect, useRef, useState } from 'react'
import { full as FullSdk } from '@audius/sdk'
import {
  ThemeProvider as HarmonyThemeProvider,
  Hint,
  IconInfo,
  IconPause,
  IconPlay,
  Paper,
  Text,
  TextInput,
  TextInputSize,
  Button,
  Flex
} from '@audius/harmony'
import { hc } from 'hono/client'
import { css } from '@emotion/react'
import { useSdk } from './hooks/useSdk'
import { useAuth } from './contexts/AuthProvider'
import type { AppType } from '..'
import { Status } from './contexts/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = hc<AppType>('/') as any

export default function App() {
  const { sdk } = useSdk()
  const { user, login, status } = useAuth()

  const [tracks, setTracks] = useState<FullSdk.TrackFull[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [playingTrackId, setPlayingTrackId] = useState<string | null>()
  const [playingTrackSrc, setPlayingTrackSrc] = useState<string | undefined>()
  const [favorites, setFavorites] = useState<Record<string, boolean>>({})

  const audioRef = useRef<HTMLAudioElement>(null)
  const handleInputRef = useRef<HTMLInputElement>(null)
  const loginWithAudiusButtonRef = useRef<HTMLDivElement>(null)

  /**
   * Init @audius/sdk oauth
   */
  useEffect(() => {
    sdk.oauth?.init({
      successCallback: async (u, token) => {
        const userRes = await sdk.users.getUser({ id: u.userId })
        if (!userRes?.data) {
          return
        }

        const user = userRes.data
        login(user, token)
      },
      errorCallback: (error: string) => console.log('Got error', error)
    })

    if (loginWithAudiusButtonRef.current) {
      sdk.oauth?.renderButton({
        element: loginWithAudiusButtonRef.current,
        scope: 'write'
      })
    }
  }, [loginWithAudiusButtonRef, sdk.users, sdk.oauth, login])

  /**
   * Fetch tracks based on the user handle present in handleInputRef
   * Update favorites state with the results of the fetch
   */
  const fetchTrack = async () => {
    const { data: selectedUser } = await sdk.users.getUserByHandle({
      handle: handleInputRef.current?.value ?? ''
    })
    if (!selectedUser) {
      return
    }

    const res = await client.tracksByUser.$get({
      query: {
        id: selectedUser.id,
        userId: user?.id ?? ''
      }
    })
    const { data: tracks } = await res.json()
    setTracks(tracks ?? [])

    const trackFavorites = (tracks ?? []).reduce(
      (result: Record<string, boolean>, track: FullSdk.TrackFull) => ({
        ...result,
        [track.id]: track.hasCurrentUserSaved
      }),
      {} as Record<string, boolean>
    )

    setFavorites(trackFavorites)
  }

  /**
   * Set the streamUrl for the audio player based on the clicked track
   */
  const streamTrack = async (trackId: string) => {
    if (trackId === playingTrackId) {
      setIsPlaying((prev) => !prev)
    } else {
      const streamUrl = await sdk.tracks.getTrackStreamUrl({ trackId })
      setPlayingTrackSrc(streamUrl)
      setPlayingTrackId(trackId)
      setIsPlaying(true)
    }
  }

  /**
   * Favorite or unfavorite a track. This requires a user to be authenticated and granted
   * write permissions to the app. Uses the client-side SDK with hedgehog wallet for signing.
   */
  const favoriteTrack =
    (trackId: string, favorite = true): MouseEventHandler<HTMLButtonElement> =>
    async (e) => {
      e.stopPropagation()
      if (user) {
        setFavorites((prev) => ({ ...prev, [trackId]: favorite }))
        try {
          if (favorite) {
            await sdk.tracks.favoriteTrack({
              userId: user.id,
              trackId
            })
          } else {
            await sdk.tracks.unfavoriteTrack({
              userId: user.id,
              trackId
            })
          }
        } catch (e) {
          console.error('Failed to favorite track', e)
          setFavorites((prev) => ({ ...prev, [trackId]: !favorite }))
        }
      } else {
        alert('Please log in with Audius to perform write operations')
      }
    }

  /**
   * Update the audio player based on the isPlaying state
   */
  useEffect(() => {
    if (isPlaying && audioRef.current?.src) {
      audioRef.current?.play()
    } else {
      audioRef.current?.pause()
    }
  }, [isPlaying])

  return (
    <HarmonyThemeProvider theme='day'>
      <Flex direction='column' gap='m' m='2xl' alignItems='center'>
        <Flex direction='column'>
          <Text color='heading' strength='strong' variant='display'>
            React + Hono + @audius/sdk
          </Text>
          <Text color='accent' variant='heading'>
            Stream and favorite tracks!
          </Text>
        </Flex>
        {status !== Status.LOADING ? (
          !user ? (
            <Hint
              icon={() => <IconInfo size='l' color='default' />}
              m='m'
              css={{ maxWidth: 400 }}
            >
              <Flex gap='m' direction='column'>
                <Text>
                  To perform writes with @audius/sdk please authorize this app
                  to perform writes on your behalf
                </Text>
                <div ref={loginWithAudiusButtonRef} />
              </Flex>
            </Hint>
          ) : (
            <Flex gap='xs'>
              <Text>Logged in as:</Text>
              <Text color='accent'>{`@${user.handle}`}</Text>
            </Flex>
          )
        ) : null}
        <Flex direction='column' gap='s'>
          <Text>Enter a user handle to fetch their tracks:</Text>
          <Flex gap='m'>
            <TextInput
              label='Get tracks for user handle:'
              size={TextInputSize.SMALL}
              defaultValue={'RAC'}
              ref={handleInputRef}
            />
            <Button size='small' onClick={fetchTrack}>
              Get tracks
            </Button>
          </Flex>
        </Flex>
        {tracks.map((track) => (
          <Paper
            m='m'
            key={track.id}
            onClick={() => streamTrack(track.id)}
            css={{ width: 400 }}
          >
            <Flex
              css={css`
                position: relative;
                cursor: pointer;
                &:hover {
                  > svg {
                    display: block;
                  }
                }
              `}
            >
              <img
                src={track.artwork?.['_150x150']}
                alt={track.title}
                css={{ height: '100%' }}
              />
              {!isPlaying || track.id !== playingTrackId ? (
                <PlayButton />
              ) : (
                <PauseButton />
              )}
            </Flex>
            <Flex direction='column' m='m' gap='s' css={{ width: '100%' }}>
              <Text>{track.title}</Text>
              <Text>{track.user.name}</Text>
              <Button
                fullWidth
                onClick={favoriteTrack(track.id, !favorites[track.id])}
                size='small'
              >
                {!favorites[track.id] ? 'Favorite' : 'Unfavorite'}
              </Button>
            </Flex>
          </Paper>
        ))}
      </Flex>
      <audio
        css={{ display: 'none' }}
        src={playingTrackSrc}
        ref={audioRef}
        autoPlay
      />
    </HarmonyThemeProvider>
  )
}

function PlayButton() {
  return (
    <IconPlay
      size='3xl'
      opacity={0.8}
      color='white'
      css={{
        display: 'none',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-45%, -50%)'
      }}
    />
  )
}

function PauseButton() {
  return (
    <IconPause
      size='3xl'
      opacity={0.8}
      color='white'
      css={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-45%, -50%)'
      }}
    />
  )
}
