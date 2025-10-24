import { useEffect, useRef, useState } from 'react'
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
  TextInputSize
} from '@audius/harmony'
import { Button, Flex } from '@audius/harmony'
import { css } from '@emotion/react'
import { useSdk } from './hooks/useSdk'

type User = { userId: string; handle: string }

export default function App() {
  const { sdk } = useSdk()

  const [user, setUser] = useState<User | null>(null)
  const [tracks, setTracks] = useState<FullSdk.TrackFull[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [playingTrackId, setPlayingTrackId] = useState<string | null>()
  const [playingTrackSrc, setPlayingTrackSrc] = useState<string | undefined>()

  const audioRef = useRef<HTMLAudioElement>(null)
  const handleInputRef = useRef<HTMLInputElement>(null)
  const loginWithAudiusButtonRef = useRef<HTMLDivElement>(null)

  /**
   * Init @audius/sdk oauth
   */
  useEffect(() => {
    sdk.oauth?.init({
      successCallback: (user: User) => setUser(user),
      errorCallback: (error: string) => console.log('Got error', error)
    })

    if (loginWithAudiusButtonRef.current) {
      sdk.oauth?.renderButton({
        element: loginWithAudiusButtonRef.current,
        scope: 'write'
      })
    }
  }, [sdk.oauth])

  /**
   * Fetch tracks based on the user handle present in handleInputRef
   */
  const fetchTrack = async () => {
    const { data: selectedUser } = await sdk.users.getUserByHandle({
      handle: handleInputRef.current?.value ?? ''
    })

    const { data: tracks } = await sdk.full.users.getTracksByUser({
      id: selectedUser?.id ?? ''
    })

    setTracks(tracks ?? [])
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
            React + @audius/sdk
          </Text>
          <Text color='accent' variant='heading'>
            Stream tracks!
          </Text>
        </Flex>
        {!user ? (
          <Hint
            icon={() => <IconInfo size='l' color='default' />}
            m='m'
            css={{ maxWidth: 400 }}
          >
            <Flex gap='m' direction='column'>
              <Text>
                To connect to your account with this app, please authorize with
                the @audius/sdk
              </Text>
              <div ref={loginWithAudiusButtonRef} />
            </Flex>
          </Hint>
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
