import { Box, useTheme } from '@audius/harmony'

type CoinProgressBarProps = {
  progress: number
  max: number
}

export const CoinProgressBar = ({ progress, max }: CoinProgressBarProps) => {
  const { color } = useTheme()

  const percentage = Math.min(100, Math.max(0, (progress / max) * 100))

  return (
    <Box
      w='100%'
      h='24px'
      borderRadius='3xl'
      css={{
        backgroundColor: color.neutral.n50,
        boxShadow: 'inset 1px 1px 7px -2px rgba(53, 54, 79, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Box
        w={`${percentage}%`}
        h='100%'
        borderRadius='3xl'
        css={{
          background: color.special.coinGradient,
          transition: 'width 0.3s ease-in-out',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      />
    </Box>
  )
}
