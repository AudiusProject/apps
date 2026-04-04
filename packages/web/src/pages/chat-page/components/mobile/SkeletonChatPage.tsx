import { SkeletonChatListItem } from '../SkeletonChatListItem'

export const SkeletonChatPage = () => {
  return (
    <>
      <SkeletonChatListItem />
      <SkeletonChatListItem style={{ opacity: 0.9 }} />
      <SkeletonChatListItem style={{ opacity: 0.8 }} />
      <SkeletonChatListItem style={{ opacity: 0.7 }} />
      <SkeletonChatListItem style={{ opacity: 0.6 }} />
      <SkeletonChatListItem style={{ opacity: 0.5 }} />
      <SkeletonChatListItem style={{ opacity: 0.4 }} />
      <SkeletonChatListItem style={{ opacity: 0.3 }} />
      <SkeletonChatListItem style={{ opacity: 0.2 }} />
      <SkeletonChatListItem style={{ opacity: 0.1 }} />
    </>
  )
}
