import type { ReactElement } from 'react'

import type { CSSObject } from '@emotion/react'

import { Flex } from 'components'

import { ComponentRule, ComponentRuleSize } from './ComponentRule'

type ComponentRulesProps = {
  rules: {
    positive: {
      component: ReactElement
      description: string | ReactElement
      css?: CSSObject
      size: ComponentRuleSize
    }

    negative: {
      component: ReactElement
      description: string | ReactElement
      css?: CSSObject
      size: ComponentRuleSize
    }
  }[]
}

export const ComponentRules = (props: ComponentRulesProps) => {
  const { rules = [] } = props

  return (
    <Flex as='article' direction='column' gap='3xl' mt='3xl'>
      {rules.map((rule, index) => {
        const key = `rule-${index}`

        return (
          <Flex as='section' key={key} gap='3xl' wrap='wrap'>
            <ComponentRule {...rule.positive} isRecommended />
            <ComponentRule {...rule.negative} isRecommended={false} />
          </Flex>
        )
      })}
    </Flex>
  )
}
