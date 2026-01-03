import { IconCaretLeft, IconButton, useTheme } from '@audius/harmony'

const messages = {
  goBack: 'Go Back'
}

type BackButtonProps = {
  onClick: () => void
}

export const BackButton = (props: BackButtonProps) => {
  const theme = useTheme()
  return (
    <IconButton
      {...props}
      css={{ marginRight: theme.spacing.l }}
      icon={IconCaretLeft}
      aria-label={messages.goBack}
      color='subdued'
    />
  )
}
