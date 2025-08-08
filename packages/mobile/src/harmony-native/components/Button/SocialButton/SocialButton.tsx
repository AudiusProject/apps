import { css } from '@emotion/native'
import { StyleSheet } from 'react-native'

import { IconInstagram, IconTikTok, IconX } from 'app/harmony-native/icons'

import { RadialGradient } from '../../RadialGradient/RadialGradient'
import { Flex } from '../../layout/Flex/Flex'
import { Button } from '../Button/Button'

import type { SocialButtonProps } from './types'

const socialLogos = {
  tiktok: IconTikTok,
  instagram: IconInstagram,
  x: IconX
}

export const SocialButton = (props: SocialButtonProps) => {
  const { socialType, ...rest } = props

  const SocialLogo = socialLogos[socialType]

  return (
    <Button
      variant='secondary'
      style={css({
        flex: 1,
        height: 48,
        paddingHorizontal: 0,
        backgroundColor:
          socialType === 'tiktok'
            ? '#fe2c55'
            : socialType === 'instagram'
              ? '#ca1d7e'
              : undefined
      })}
      {...rest}
    >
      {socialType === 'instagram' ? (
        <Flex w='100%' h='100%' alignItems='center' justifyContent='center'>
          <RadialGradient
            style={[StyleSheet.absoluteFillObject, { zIndex: 1 }]}
            colors={['#FFD600', '#FF6930', '#FE3B36', 'rgba(254, 59, 54, 0)']}
            stops={[0, 0.4844, 0.7344, 1]}
            center={[40, 120]}
            radius={70}
          />
          <RadialGradient
            style={StyleSheet.absoluteFillObject}
            colors={['#FF1B90', '#F80261', '#ED00C0', '#C500E9', '#7017FF']}
            stops={[0.2439, 0.4367, 0.6885, 0.7768, 0.8932]}
            center={[84.5, 113]}
            radius={136}
          />
          <SocialLogo color='white' size='l' style={{ zIndex: 2 }} />
        </Flex>
      ) : socialType === 'tiktok' ? (
        <SocialLogo color='white' size='l' />
      ) : (
        <SocialLogo color='default' size='l' />
      )}
    </Button>
  )
}
