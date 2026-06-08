import { Flex } from '@audius/harmony-native'
import { Tile } from 'app/components/core'
import Skeleton from 'app/components/skeleton'
import { makeStyles } from 'app/styles'

const useStyles = makeStyles(({ spacing }) => ({
  root: {
    marginTop: spacing(2),
    paddingHorizontal: spacing(2)
  },
  content: {
    padding: spacing(4)
  },
  profilePicture: {
    borderRadius: 19,
    marginRight: spacing(-2)
  }
}))

type NotificationListItemSkeletonProps = {
  noShimmer?: boolean
}

export const NotificationListItemSkeleton = ({
  noShimmer
}: NotificationListItemSkeletonProps) => {
  const styles = useStyles()
  return (
    <Tile styles={{ root: styles.root, content: styles.content }}>
      <Flex
        row
        alignItems='center'
        borderBottom='default'
        pb='l'
        mb='l'
        gap='m'
      >
        <Skeleton
          width={30}
          height={30}
          style={{ borderRadius: 15 }}
          noShimmer={noShimmer}
        />
        <Flex row>
          <Skeleton
            width={38}
            height={38}
            style={styles.profilePicture}
            noShimmer={noShimmer}
          />
          <Skeleton
            width={38}
            height={38}
            style={styles.profilePicture}
            noShimmer={noShimmer}
          />
          <Skeleton
            width={38}
            height={38}
            style={styles.profilePicture}
            noShimmer={noShimmer}
          />
        </Flex>
      </Flex>
      <Flex gap='s'>
        <Skeleton width='90%' height={20} noShimmer={noShimmer} />
        <Skeleton width='60%' height={20} noShimmer={noShimmer} />
      </Flex>
      <Flex row alignItems='center' mt='l'>
        <Skeleton width={64} height={12} noShimmer={noShimmer} />
      </Flex>
    </Tile>
  )
}
