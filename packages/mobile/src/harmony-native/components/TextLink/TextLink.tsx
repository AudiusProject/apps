import { isInternalAudiusUrl } from '@audius/common/utils'

import { ExternalLink } from './ExternalLink'
import { InternalLink, InternalLinkTo } from './InternalLink'
import { TextPressable } from './TextPressable'
import {
  isExternalLinkProps,
  isInternalLinkToProps,
  type TextLinkProps
} from './types'

/**
 * TextLink that supports 'url' | 'to' | 'onPress'
 *
 * Notably this component is Text all the way down so that it flows properly inline
 * with other Text components.
 */
export const TextLink = <ParamList extends ReactNavigation.RootParamList>(
  props: TextLinkProps<ParamList>
) => {
  const isTo = isInternalLinkToProps(props)
  const isUrl = isExternalLinkProps(props)

  // If isExternal is explicitly set to true, force external link behavior
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
