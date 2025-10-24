import LinearGradient from 'react-native-linear-gradient'

import { Box, spacing, useTheme } from '@audius/harmony-native'

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
  const { color } = useTheme()
  const percentage = Math.max(
    0,
    Math.min(100, ((value - min) / (max - min)) * 100)
  )

  return (
    <Box
      w='100%'
      h={spacing.unit1}
      borderRadius='3xl'
      backgroundColor='surface2'
    >
      <LinearGradient
        {...color.special.gradient}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          width: `${percentage}%`,
          height: '100%',
          borderRadius: spacing['3xl']
        }}
      />
    </Box>
  )
}
