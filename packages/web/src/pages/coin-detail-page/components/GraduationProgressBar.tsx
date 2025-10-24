import { Box, useTheme } from '@audius/harmony'

interface GraduationProgressBarProps {
  value: number
  min?: number
  max?: number
}

export const GraduationProgressBar = ({
  value,
  min = 0,
  max = 100
}: GraduationProgressBarProps) => {
  const theme = useTheme()
  const percentage = Math.max(
    0,
    Math.min(100, ((value - min) / (max - min)) * 100)
  )

  return (
    <Box
      w='100%'
      h='4px'
      borderRadius='3xl'
      backgroundColor='surface2'
      role='progressbar'
      aria-valuenow={percentage}
      aria-valuemin={min}
      aria-valuemax={max}
    >
      <Box
        w={`${percentage}%`}
        h='100%'
        borderRadius='3xl'
        css={{
          background: theme.color.background.gradient,
          transition: 'width 300ms ease-out'
        }}
      />
    </Box>
  )
}
