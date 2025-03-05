import type { ReactNode } from 'react'

import type { ImageSourcePropType } from 'react-native'
import { TouchableOpacity, View, Image } from 'react-native'

import type { IconComponent } from '@audius/harmony-native'
import { Flex, IconClose, spacing } from '@audius/harmony-native'
import { Text } from 'app/components/core'
import { makeStyles } from 'app/styles'
import { zIndex } from 'app/utils/zIndex'
type DrawerHeaderProps = {
  onClose: () => void
  title?: ReactNode
  titleIcon?: IconComponent
  titleImage?: ImageSourcePropType
  isFullscreen?: boolean
  blockClose?: boolean
}

export const useStyles = makeStyles(({ spacing }) => ({
  titleBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(8),
    zIndex: zIndex.ONE
  },

  dismissContainer: {
    position: 'absolute',
    top: spacing(3),
    left: spacing(3)
  },

  titleImage: {
    height: spacing(6),
    width: spacing(6)
  }
}))

export const DrawerHeader = (props: DrawerHeaderProps) => {
  const {
    onClose,
    title,
    titleIcon: TitleIcon,
    titleImage,
    isFullscreen,
    blockClose = false
  } = props
  const styles = useStyles()

  return title || isFullscreen ? (
    <View style={styles.titleBarContainer}>
      {isFullscreen && !blockClose ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onClose}
          style={styles.dismissContainer}
          hitSlop={spacing.m}
        >
          <IconClose size='m' color='subdued' />
        </TouchableOpacity>
      ) : null}
      {title ? (
        <Flex gap='s' alignItems='center' direction='row'>
          {TitleIcon ? <TitleIcon size='m' color='default' /> : null}
          {titleImage ? (
            <Image style={styles.titleImage} source={titleImage} />
          ) : null}
          <Text fontSize='xl' weight='heavy' textTransform='uppercase'>
            {title}
          </Text>
        </Flex>
      ) : null}
    </View>
  ) : (
    <View />
  )
}
