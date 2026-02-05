import { useMemo } from 'react'

import { times, random } from 'lodash'
import { View } from 'react-native'

import { Flex } from '@audius/harmony-native'
import Skeleton, { StaticSkeleton } from 'app/components/skeleton'
import { makeStyles } from 'app/styles'

const useStyles = makeStyles(({ palette, spacing }) => ({
  root: {
    marginBottom: 40
  },
  coverPhoto: {
    height: 96
  },
  profilePicture: {
    position: 'absolute',
    top: 52,
    left: 12,
    zIndex: 101,

    height: 82,
    width: 82,
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
    width: 100,
    marginBottom: spacing(3)
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

const BioSkeleton = () => {
  const baseStyle = {
    height: 12,
    marginRight: 4,
    marginBottom: 8
  }

  const elements = useMemo(
    () => times(random(5, 10), () => random(20, 100)),
    []
  )

  return (
    <>
      {elements.map((elementWidth: number, i) => (
        <StaticSkeleton key={i} style={[baseStyle, { width: elementWidth }]} />
      ))}
    </>
  )
}

export const ExpandableSectionSkeleton = () => {
  const styles = useStyles()
  return (
    <Flex column gap='s' backgroundColor='white' p='l'>
      <Flex row wrap='wrap'>
        <BioSkeleton />
      </Flex>
      <Flex style={styles.tierAndSocials}>
        <StaticSkeleton style={styles.tier} />
        <View style={styles.socialLinks}>
          <StaticSkeleton style={styles.socialLink} />
          <StaticSkeleton style={styles.socialLink} />
          <StaticSkeleton style={styles.socialLink} />
        </View>
      </Flex>
    </Flex>
  )
}

export const ProfileHeaderSkeleton = () => {
  const styles = useStyles()
  const statSkeleton = <StaticSkeleton style={styles.stat} />

  return (
    <Flex backgroundColor='white'>
      <StaticSkeleton height={96} />
      <Skeleton style={styles.profilePicture} />
      <Flex p='l' gap='s' backgroundColor='white'>
        <Flex row justifyContent='space-between' backgroundColor='white'>
          <Flex mt='3xl'>
            <StaticSkeleton style={styles.name} />
            <StaticSkeleton style={styles.handle} />
          </Flex>
          <Flex row gap='s'>
            <StaticSkeleton height={32} width={32} />
            <StaticSkeleton height={32} width={120} />
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
