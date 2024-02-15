import type { ReactNode } from 'react'

import type { Image } from '@audius/common/store'
import { css } from '@emotion/native'
import { BlurView } from '@react-native-community/blur'
import { isEmpty } from 'lodash'
import type {
  ImageBackgroundProps,
  ImageSourcePropType,
  ImageStyle,
  StyleProp
} from 'react-native'
import { ImageBackground, View } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'

import type { CornerRadiusOptions } from '@audius/harmony-native'

import { useTheme } from '../../foundations/theme'

type CoverPhotoImage = Exclude<
  Image | ImageSourcePropType | null | undefined,
  number
>

export type CoverPhotoProps = {
  profilePicture?: CoverPhotoImage
  coverPhoto?: CoverPhotoImage
  style?: StyleProp<ImageStyle>
  children?: ReactNode
  topCornerRadius?: CornerRadiusOptions
} & Omit<ImageBackgroundProps, 'source'>

export const CoverPhoto = (props: CoverPhotoProps) => {
  const {
    profilePicture,
    coverPhoto,
    style,
    children,
    topCornerRadius,
    ...other
  } = props
  const { color, cornerRadius } = useTheme()

  const rootStyle = css({
    backgroundColor: color.neutral.n300,
    height: 96,
    ...(topCornerRadius
      ? {
          borderTopLeftRadius: cornerRadius[topCornerRadius],
          borderTopRightRadius: cornerRadius[topCornerRadius],
          overflow: 'hidden'
        }
      : {})
  })

  const fullHeightStyle = css({ height: '100%' })

  const getSource = () => {
    let source: CoverPhotoImage = {
      uri: undefined
    }
    let usingProfilePicture = false
    if (profilePicture && !isEmpty(profilePicture)) {
      source = profilePicture
      usingProfilePicture = true
    }
    if (coverPhoto && !isEmpty(coverPhoto)) {
      source = coverPhoto
      usingProfilePicture = false
    }

    // Android upload format does not quite match the expected format, so we have to drill into 'file' to workaround for android
    if ('file' in source && !('uri' in source)) {
      return { source: source.file, usingProfilePicture }
    } else {
      return { source, usingProfilePicture }
    }
  }

  const { source, usingProfilePicture } = getSource()

  return (
    <ImageBackground
      source={source as ImageSourcePropType}
      style={[rootStyle, style]}
      {...other}
    >
      {!profilePicture && !coverPhoto ? (
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.20)', 'rgba(0, 0, 0, 0.00)']}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={fullHeightStyle}
        />
      ) : null}
      {profilePicture && usingProfilePicture ? (
        <View style={style}>
          <BlurView blurType='light' blurAmount={20} style={fullHeightStyle} />
        </View>
      ) : null}
      {children}
    </ImageBackground>
  )
}
