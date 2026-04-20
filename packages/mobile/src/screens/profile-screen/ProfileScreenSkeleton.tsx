import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Flex } from '@audius/harmony-native'
import Skeleton, { StaticSkeleton } from 'app/components/skeleton'
import { makeStyles } from 'app/styles'

import { COVER_PHOTO_CONTENT_HEIGHT } from './ProfileCoverPhoto'

const useStyles = makeStyles(({ palette, spacing }) => ({
  root: {
    marginBottom: 40
  },
  profilePicture: {
    position: 'absolute',
    left: spacing(4),
    zIndex: 101,

    height: 80,
    width: 80,
    borderRadius: 1000,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: palette.white,
    overflow: 'hidden',
    backgroundColor: palette.neutralLight6
  },
  header: {
    backgroundColor: palette.white,
    paddingTop: spacing(8),
    paddingHorizontal: spacing(3)
  },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing(5)
  },
  name: {
    height: spacing(5),
    width: 100
  },
  handle: {
    height: spacing(4),
    width: 80
  },
  actionButton: {
    height: 35,
    width: 120
  },
  stats: {
    flexDirection: 'row',
    marginBottom: spacing(3)
  },
  stat: {
    height: spacing(4),
    width: 80,
    marginRight: spacing(5)
  },
  bio: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    marginBottom: spacing(3)
  },
  tierAndSocials: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(3)
  },
  tier: {
    height: 50,
    width: 100,
    borderRadius: 12,
    marginRight: spacing(10)
  },
  socialLinks: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flex: 4,
    gap: spacing(3)
  },
  socialLink: {
    height: spacing(8),
    width: spacing(8),
    marginRight: spacing(3)
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.neutralLight8,
    backgroundColor: palette.white,
    paddingVertical: spacing(3),
    height: 50
  },
  tab: {
    height: spacing(8),
    width: spacing(15)
  }
}))

export const ExpandableSectionSkeleton = () => {
  const baseStyle = { height: 12, marginRight: 4, marginBottom: 8 }
  // Matches the initial CollapsedSection: a 2-line bio. We don't render tier
  // + full socials here because they only appear once the user expands the
  // header, so reserving that space would cause a skeleton→content shift.
  return (
    <Flex column gap='s' backgroundColor='white' ph='m' pb='s'>
      <Flex row wrap='wrap'>
        <StaticSkeleton style={[baseStyle, { width: 80 }]} />
        <StaticSkeleton style={[baseStyle, { width: 60 }]} />
        <StaticSkeleton style={[baseStyle, { width: 100 }]} />
        <StaticSkeleton style={[baseStyle, { width: 70 }]} />
        <StaticSkeleton style={[baseStyle, { width: 90 }]} />
      </Flex>
    </Flex>
  )
}

export const ProfileHeaderSkeleton = () => {
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const statSkeleton = <StaticSkeleton style={styles.stat} />
  const coverPhotoHeight = insets.top + COVER_PHOTO_CONTENT_HEIGHT

  return (
    <Flex backgroundColor='white'>
      <StaticSkeleton height={coverPhotoHeight} />
      <Skeleton style={[styles.profilePicture, { top: insets.top + 48 }]} />
      {/* Matches the real ProfileHeader structure so the skeleton→content
      transition doesn't cause layout shift. */}
      <Flex
        column
        pv='s'
        ph='m'
        backgroundColor='white'
        style={{ gap: 9 }}
      >
        <Flex column pv='s' gap='s'>
          <Flex row justifyContent='flex-end' gap='xs'>
            <StaticSkeleton height={32} width={32} />
            <StaticSkeleton height={32} width={120} />
          </Flex>
          <Flex alignItems='flex-start' gap='2xs'>
            <StaticSkeleton style={styles.name} />
            <StaticSkeleton style={styles.handle} />
          </Flex>
        </Flex>
        <Flex row>
          {statSkeleton}
          {statSkeleton}
          {statSkeleton}
        </Flex>
      </Flex>
    </Flex>
  )
}

export const ProfileTabsSkeleton = () => {
  const styles = useStyles()

  return (
    <>
      <StaticSkeleton style={styles.tabs} />
    </>
  )
}

export const ProfileScreenSkeleton = () => {
  return (
    <Flex column h='100%'>
      <ProfileHeaderSkeleton />
      <ExpandableSectionSkeleton />
      <ProfileTabsSkeleton />
    </Flex>
  )
}
