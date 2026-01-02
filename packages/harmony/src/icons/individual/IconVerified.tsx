import { IconComponent, SVGIconProps } from '~harmony/components/icon'
import IconVerifiedSVG from '../../assets/icons/Verified.svg'

export const IconVerified = ((props: SVGIconProps) => (
  <IconVerifiedSVG color='active' colorSecondary='white' {...props} />
)) as IconComponent
