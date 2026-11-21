import { isInternalAudiusUrl } from '@audius/common/utils'

import { ExternalLink } from './ExternalLink'
import { InternalLink, InternalLinkTo } from './InternalLink'
import { TextPressable } from './TextPressable'
import {
  isExternalLinkProps,
  isInternalLinkToProps,
  type TextLinkProps
} from './types'

export const TextLink = <ParamList extends ReactNavigation.RootParamList>(
  props: TextLinkProps<ParamList>
) => {
  const isTo = isInternalLinkToProps(props)
  const isUrl = isExternalLinkProps(props)

  if (props.isExternal && isUrl) {
    return <ExternalLink {...props} />
  }

  if (isTo) {
    return <InternalLinkTo {...props} />
  } else if (isUrl && isInternalAudiusUrl(props.url)) {
    return <InternalLink {...props} />
  } else if (isUrl) {
    return <ExternalLink {...props} />
  } else {
    return <TextPressable {...props} />
  }
}
