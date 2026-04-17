import DesktopContestPage from '../desktop/ContestPage'

type MobileContestPageProps = {
  containerRef?: React.RefObject<HTMLDivElement>
}

// The contest page doesn't have a dedicated mobile layout yet — the desktop
// layout is already vertically stacked and narrow enough to work on mobile
// widths. Pending the Figma mobile frames, this just delegates.
const ContestPage = (props: MobileContestPageProps) => {
  return <DesktopContestPage {...props} />
}

export default ContestPage
