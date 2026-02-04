import { useState, useMemo, useEffect, useCallback } from 'react'

import { useCollection, useTrack } from '@audius/common/api'
import { Name, PlayableType, ID, Track } from '@audius/common/models'
import { Button, Modal, SegmentedControl } from '@audius/harmony'
import { Id } from '@audius/sdk'
import cn from 'classnames'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'

import { useRecord, make } from 'common/store/analytics/actions'
import { AppState } from 'store/types'
import { useSelector } from 'utils/reducer'
import { BASE_GA_URL } from 'utils/route'

import styles from './EmbedModal.module.css'
import EmbedCopy from './components/EmbedCopy'
import EmbedFrame from './components/EmbedFrame'
import { close } from './store/actions'
import { getIsOpen, getId, getKind } from './store/selectors'
import { Size } from './types'

const BASE_EMBED_URL = `${BASE_GA_URL}/embed`

const FlavorMap = {
  [Size.STANDARD]: 'card',
  [Size.COMPACT]: 'compact',
  [Size.TINY]: 'tiny'
}

const KindMap = {
  [PlayableType.TRACK]: 'track',
  [PlayableType.PLAYLIST]: 'playlist',
  [PlayableType.ALBUM]: 'album'
}

const constructUrl = (
  kind: PlayableType,
  id: ID,
  size: Size,
  permalink?: string
) => {
  // For tracks, use permalink format if available (needed for private tracks)
  if (kind === PlayableType.TRACK && permalink) {
    // Permalink format is /{handle}/{slug}, remove leading slash
    const permalinkPath = permalink.startsWith('/')
      ? permalink.slice(1)
      : permalink
    return `${BASE_EMBED_URL}/${KindMap[kind]}/${permalinkPath}?flavor=${
      FlavorMap[size]
    }`
  }
  return `${BASE_EMBED_URL}/${KindMap[kind]}/${Id.parse(id)}?flavor=${
    FlavorMap[size]
  }`
}

const formatIFrame = (url: string, size: Size) => {
  let extras
  switch (size) {
    case Size.STANDARD:
      extras = 'width="100%" height="480"'
      break
    case Size.COMPACT:
      extras = 'width="100%" height="120"'
      break
    case Size.TINY:
      extras = 'width="100%" height="24" allowTransparency="true"'
      break
  }
  return `<iframe src=${url} ${extras} allow="encrypted-media" style="border: none;"></iframe>`
}

const useMetadata = () => {
  const id = useSelector(getId)
  const kind = useSelector(getKind)

  const track = useTrack(id, {
    enabled: kind === PlayableType.TRACK
  })

  const collection = useCollection(id, {
    enabled: kind === PlayableType.PLAYLIST || kind === PlayableType.ALBUM
  })

  return kind === PlayableType.TRACK ? track : collection
}

const messages = {
  title: {
    [PlayableType.TRACK]: 'Embed Track',
    [PlayableType.PLAYLIST]: 'Embed Playlist',
    [PlayableType.ALBUM]: 'Embed Album'
  },
  playerSize: 'Player Size',
  embedCode: 'Embed Code'
}

type OwnProps = {}

type EmbedModalProps = OwnProps &
  ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps>

const EmbedModal = ({ isOpen, kind, id, close }: EmbedModalProps) => {
  const { data: metadata } = useMetadata()
  const [size, setSize] = useState(Size.STANDARD)
  // Delay the rendering of the embed frame since it's expensive.
  // This shores up the modal open animation a bit.
  const [delayedOpen, setDelayedOpen] = useState(false)
  useEffect(() => {
    setTimeout(() => setDelayedOpen(isOpen), 100)
  }, [isOpen])

  // Configure analytics
  const record = useRecord()

  useEffect(() => {
    if (isOpen && kind && id) {
      record(make(Name.EMBED_OPEN, { kind, id: `${id}` }))
    }
  }, [isOpen, kind, id, record])
  const onCopy = useCallback(() => {
    if (kind && id) {
      record(
        make(Name.EMBED_COPY, {
          kind,
          id: `${id}`,
          size: FlavorMap[size] as 'card' | 'compact' | 'tiny'
        })
      )
    }
  }, [kind, id, record, size])

  // Configure frames
  const trackPermalink =
    kind === PlayableType.TRACK && metadata
      ? (metadata as Track).permalink
      : undefined

  const standardFrameString = useMemo(() => {
    if (!kind || !id || !metadata) return ''
    return formatIFrame(
      constructUrl(kind, id, Size.STANDARD, trackPermalink),
      Size.STANDARD
    )
  }, [kind, id, metadata, trackPermalink])
  const compactFrameString = useMemo(() => {
    if (!kind || !id || !metadata) return ''
    return formatIFrame(
      constructUrl(kind, id, Size.COMPACT, trackPermalink),
      Size.COMPACT
    )
  }, [kind, id, metadata, trackPermalink])
  const tinyFrameString = useMemo(() => {
    if (!kind || !id || !metadata) return ''
    return formatIFrame(
      constructUrl(kind, id, Size.TINY, trackPermalink),
      Size.TINY
    )
  }, [kind, id, metadata, trackPermalink])

  const tabOptions = [
    {
      key: Size.STANDARD,
      text: Size.STANDARD
    },
    {
      key: Size.COMPACT,
      text: Size.COMPACT
    },
    {
      key: Size.TINY,
      text: Size.TINY
    }
  ]

  let frameString
  switch (size) {
    case Size.STANDARD:
      frameString = standardFrameString
      break
    case Size.COMPACT:
      frameString = compactFrameString
      break
    case Size.TINY:
      frameString = tinyFrameString
      break
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      showDismissButton
      showTitleHeader
      title={kind ? messages.title[kind] : ''}
      contentHorizontalPadding={32}
      bodyClassName={styles.modalBodyStyle}
      titleClassName={styles.modalTitleStyle}
    >
      <div className={styles.embed}>
        <div className={styles.frame}>
          <div
            className={cn(styles.switcher, {
              [styles.show]: size === Size.STANDARD
            })}
          >
            {delayedOpen && <EmbedFrame frameString={standardFrameString} />}
          </div>
          {kind === PlayableType.TRACK && (
            <div
              className={cn(styles.switcher, {
                [styles.show]: size === Size.COMPACT
              })}
            >
              {delayedOpen && <EmbedFrame frameString={compactFrameString} />}
            </div>
          )}
          {kind === PlayableType.TRACK && (
            <div
              className={cn(styles.switcher, {
                [styles.show]: size === Size.TINY
              })}
            >
              {delayedOpen && (
                <EmbedFrame width={265} frameString={tinyFrameString} />
              )}
            </div>
          )}
        </div>
        <div className={styles.details}>
          {metadata && (metadata as Track).track_id && (
            <div className={styles.panel}>
              <div className={styles.title}>{messages.playerSize}</div>
              <SegmentedControl
                options={tabOptions}
                selected={size}
                onSelectOption={(size) => setSize(size)}
              />
            </div>
          )}
          <div className={styles.panel}>
            <div className={styles.title}>{messages.embedCode}</div>
            <EmbedCopy frameString={frameString} onCopy={onCopy} />
          </div>

          <div className={styles.bottom}>
            <Button variant='primary' onClick={close}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function mapStateToProps(state: AppState) {
  return {
    isOpen: getIsOpen(state),
    id: getId(state),
    kind: getKind(state)
  }
}

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    close: () => dispatch(close())
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(EmbedModal)
