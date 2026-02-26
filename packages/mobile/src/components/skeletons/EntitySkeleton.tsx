import { useMemo, type ReactNode } from 'react'

import { times, random } from 'lodash'
import { View } from 'react-native'

import { Divider, Text } from '@audius/harmony-native'
import { Tile } from 'app/components/core'
import { StaticSkeleton } from 'app/components/skeleton/Skeleton'
import { makeStyles } from 'app/styles'

const messages = {
  track: 'Track',
  playlist: 'Playlist',
  album: 'Album'
}

const useStyles = makeStyles(({ spacing, palette }) => ({
  root: {},
  content: {
    paddingVertical: spacing(3) + 2,
    paddingHorizontal: spacing(4)
  },
  heading: {
    alignItems: 'center'
  },
  trackArtwork: {
    borderWidth: 1,
    borderColor: palette.neutralLight8,
    borderRadius: 4,
    marginTop: spacing(4),
    height: 224,
    width: 224
  },
  trackTitle: {
    marginVertical: spacing(2),
    height: 24,
    width: 200
  },
  artistName: {
    marginVertical: spacing(2),
    height: 24,
    width: 150
  },
  playButton: {
    marginVertical: spacing(2),
    height: 50,
    width: '100%'
  },
  socialActions: {
    flexDirection: 'row',
    marginVertical: spacing(2)
  },
  socialAction: {
    width: 25,
    height: 25,
    marginHorizontal: spacing(4)
  },
  metrics: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginVertical: spacing(2)
  },
  metric: {
    height: 20,
    width: 30
  },
  metadataSection: {
    marginVertical: spacing(2),
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap'
  },
  description: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: spacing(3)
  },
  descriptionText: {
    height: 12,
    marginRight: spacing(1),
    marginBottom: spacing(2)
  },
  metadata: {
    width: '40%',
    height: 15,
    marginVertical: spacing(2),
    marginRight: spacing(3)
  }
}))

export type EntitySkeletonProps = {
  entityType?: 'track' | 'playlist' | 'album'
  children?: ReactNode
}

export const EntitySkeleton = (props: EntitySkeletonProps) => {
  const { entityType, children } = props
  const styles = useStyles()

  const descriptionElementCount = useMemo(
    () => times(random(5, 15), () => random(20, 100)),
    []
  )

  const divider = <Divider w='100%' mv='s' />

  return (
    <Tile styles={{ root: styles.root, content: styles.content }}>
      <View style={styles.heading}>
        <Text
          variant='label'
          size='m'
          strength='default'
          textTransform='uppercase'
          color='subdued'
        >
          {entityType ? messages[entityType] : ''}
        </Text>
        <StaticSkeleton style={styles.trackArtwork} />
        <StaticSkeleton style={styles.trackTitle} />
        <StaticSkeleton style={styles.artistName} />
        <StaticSkeleton style={styles.playButton} />
        <View style={styles.socialActions}>
          <StaticSkeleton style={styles.socialAction} />
          <StaticSkeleton style={styles.socialAction} />
          <StaticSkeleton style={styles.socialAction} />
          <StaticSkeleton style={styles.socialAction} />
        </View>
        {divider}
        <View style={styles.metrics}>
          <StaticSkeleton style={styles.metric} />
          <StaticSkeleton style={styles.metric} />
          <StaticSkeleton style={styles.metric} />
        </View>
        <View style={styles.description}>
          {descriptionElementCount.map((elementWidth: number, i) => (
            <StaticSkeleton
              key={i}
              style={[styles.descriptionText, { width: elementWidth }]}
            />
          ))}
        </View>
        {divider}
        <View style={styles.metadataSection}>
          <StaticSkeleton style={styles.metadata} />
          <StaticSkeleton style={styles.metadata} />
          <StaticSkeleton style={styles.metadata} />
        </View>
        {children ? (
          <>
            {divider}
            {children}
          </>
        ) : null}
      </View>
    </Tile>
  )
}
