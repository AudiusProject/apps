import type { ReactNode } from 'react'
import { Children, Fragment } from 'react'

import { StyleSheet, View } from 'react-native'

import { Flex, Text, useTheme } from '@audius/harmony-native'

type FormGroupProps = {
  title?: string
  children: ReactNode
}

/**
 * iOS settings-style group: a small caption over a rounded card whose rows are
 * split by hairlines.
 */
export const FormGroup = ({ title, children }: FormGroupProps) => {
  const { color, cornerRadius, spacing } = useTheme()
  const rows = Children.toArray(children)

  return (
    <Flex gap='xs' w='100%'>
      {title ? (
        <Text
          variant='label'
          size='s'
          color='subdued'
          style={{ marginLeft: spacing.l, textTransform: 'none' }}
        >
          {title}
        </Text>
      ) : null}
      <View
        style={{
          backgroundColor: color.background.white,
          borderRadius: cornerRadius.l,
          overflow: 'hidden'
        }}
      >
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  marginLeft: spacing.l,
                  backgroundColor: color.border.default
                }}
              />
            ) : null}
            {row}
          </Fragment>
        ))}
      </View>
    </Flex>
  )
}
