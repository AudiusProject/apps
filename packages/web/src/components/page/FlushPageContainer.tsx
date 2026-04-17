import { Flex, FlexProps } from '@audius/harmony'

import {
  MAX_PAGE_WIDTH_PX,
  MIN_PAGE_WIDTH_PX,
  PAGE_GUTTER_PX
} from 'common/utils/layout'

type FlushPageContainerProps = FlexProps & {
  contentMinWidthPx?: number
}

export const FlushPageContainer = (props: FlushPageContainerProps) => {
  const {
    children,
    contentMinWidthPx = MIN_PAGE_WIDTH_PX,
    ...flexProps
  } = props
  return (
    <Flex w='100%' flex='1 1 0' ph={PAGE_GUTTER_PX} {...flexProps}>
      <Flex
        flex='1'
        w='100%'
        css={{
          maxWidth: MAX_PAGE_WIDTH_PX,
          minWidth: contentMinWidthPx,
          // Center content when viewport is wider than max content width
          // Left-align when viewport is narrower than max content width
          margin: '0 auto'
        }}
      >
        {children}
      </Flex>
    </Flex>
  )
}
