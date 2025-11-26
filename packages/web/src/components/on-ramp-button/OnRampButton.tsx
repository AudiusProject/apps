import { forwardRef } from 'react'

import { OnRampProvider } from '@audius/common/store'
import {
  Button,
  ButtonProps,
  IconLogoLinkByStripe
} from '@audius/harmony'

const messages = {
  buyUsing: 'Buy using'
}

const stripeColor = '#00aaf5'

type OnRampButtonProps = ButtonProps & {
  provider: OnRampProvider
  buttonPrefix?: string
  textClassName?: string
}

export const OnRampButton = forwardRef<HTMLButtonElement, OnRampButtonProps>(
  (props, ref) => {
    const { buttonPrefix: buttonPrefixProp, provider, ...otherProps } = props
    const isStripe = provider === OnRampProvider.STRIPE
    const buttonPrefix =
      buttonPrefixProp || messages.buyUsing

    return (
      <Button
        ref={ref}
        aria-label={`${buttonPrefix} ${provider}`}
        hexColor={isStripe ? stripeColor : undefined}
        fullWidth
        {...otherProps}
      >
        {buttonPrefix}
        {isStripe ? (
          <IconLogoLinkByStripe width={'6em'} height={'1.33em'} color='white' />
        ) : null}
      </Button>
    )
  }
)
