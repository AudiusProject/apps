import { MouseEvent } from 'react'

import { route } from '@audius/common/utils'
import { Tag, TagProps } from '@audius/harmony'
import { Link } from 'react-router'

type SearchTagProps = Extract<TagProps, { children: string }> & {
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void
}

export const SearchTag = (props: SearchTagProps) => {
  const { onClick, children, ...other } = props

  const linkTo = route.searchPage({ query: `#${children}` })

  return (
    <Link to={linkTo} onClick={onClick}>
      <Tag {...other}>{children}</Tag>
    </Link>
  )
}
