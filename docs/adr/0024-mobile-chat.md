# 0024. Chat and DMs on mobile

- Status: Accepted
- Date: 2026-11-21

## Context

Inbox, composer and blast behaviour in the mobile app. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `src/components/block-messages-drawer/BlockMessagesDrawer.tsx`

- BlockMessagesDrawer reads getDoesBlockUser assuming ProfileActionsDrawer has already fetched the blockee list. ([L43](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/block-messages-drawer/BlockMessagesDrawer.tsx#L43))

### `src/components/comments/CommentBlock.tsx`

- CommentBlock uses closeAndExitNowPlaying from CommentSectionContext, not useCommentDrawer, because @gorhom/portal renders sheet content outside CommentDrawerContext and closing only the comment drawer would leave now-playing covering the destination. ([L40](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/CommentBlock.tsx#L40))
- CommentBlock wraps CommentBlockInternal because the comment query can return undefined and hooks rules prevent returning early inside the inner component. ([L221](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/CommentBlock.tsx#L221))

### `src/components/comments/CommentDrawer.tsx`

- CommentDrawer always renders BottomSheetFlatList with ListEmptyComponent because swapping in a plain view at zero comments breaks keyboard avoidance and the composer send button. ([L178](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/CommentDrawer.tsx#L178))
- CommentDrawer reads closeAndExitNowPlaying inside the provider and threads it via CommentSectionContext because @gorhom/portal renders content at a sibling PortalHost and calling useCommentDrawer there crashes. ([L247](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/CommentDrawer.tsx#L247))
- CommentDrawer fetches the track itself and shows a loading state because opening from a lineup tile may not have the full track cached, and CommentSectionProvider would render an empty sheet. ([L257](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/CommentDrawer.tsx#L257))

### `src/components/comments/CommentDrawerContext.tsx`

- CommentDrawerContext.closeAndExitNowPlaying closes the comment drawer and the now-playing drawer so in-drawer navigation targets are visible; close() keeps now-playing open. ([L28](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/CommentDrawerContext.tsx#L28))
- CommentDrawerContext records that the sheet already dismissed itself because since @gorhom/bottom-sheet 5.2.11 calling dismiss() on an unmounted modal leaves it stuck and the next present() never renders. ([L66](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/CommentDrawerContext.tsx#L66))

### `src/components/comments/CommentThread.tsx`

- CommentThread guards rootComment before reading id because the comment cache can briefly be undefined or a {} placeholder during rehydration after a post mutation, which crashed the app. ([L37](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/CommentThread.tsx#L37))
- CommentThread checks hasNextPage === false explicitly because react-query leaves it undefined when the query is inactive. ([L131](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/CommentThread.tsx#L131))

### `src/constants/storage-keys.ts`

- VIEWED_BLAST_CHATS_KEY stores which blast chat threads were viewed so the 'Chat Blast: Message Viewed' analytics event fires once per blast. ([L11](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/constants/storage-keys.ts#L11))

### `src/screens/chat-screen/ChatBlastAudienceDisplay.tsx`

- ChatBlastAudienceDisplay fetches USER_LIST_LIMIT + 1 audience users so the overflow count bubble has a background photo. ([L30](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/chat-screen/ChatBlastAudienceDisplay.tsx#L30))

### `src/screens/chat-screen/ChatListScreen.tsx`

- ChatListScreen keeps fetching older pages until a Priority/General tab has MIN_VISIBLE_CHATS_PER_TAB rows because chats paginate by recency across all categories, so a tab can be empty while older pages hold its chats. ([L34](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/chat-screen/ChatListScreen.tsx#L34))
- ChatListScreen stops backfilling after MAX_BACKFILL_PAGES per tab visit so a mostly empty tab does not page through the entire chat history. ([L40](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/chat-screen/ChatListScreen.tsx#L40))
- ChatListScreen disables maintainVisibleContentPosition because chats with new messages move to the top and should stay in view rather than the list holding position. ([L269](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/chat-screen/ChatListScreen.tsx#L269))
- Chat screens are wrapped in withManagedAccountRestriction because DMs act as the signed-in wallet, so they are unavailable while managing another account. ([L281](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/chat-screen/ChatListScreen.tsx#L281))

### `src/screens/chat-screen/ChatScreen.tsx`

- getNewMessageToastThreshold uses the autoscroll threshold on iOS because iOS auto-scrolls to new messages within that distance, so no toast is needed there; other platforms use a fixed threshold. ([L181](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/chat-screen/ChatScreen.tsx#L181))
- ChatScreen adds spacing(6) composer offset for chat blasts because blasts render an extra screen header. ([L255](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/chat-screen/ChatScreen.tsx#L255))
- ChatScreen snapshots the chat into chatFrozenRef so the unread separator does not vanish when the chat is marked read on entry; a ref avoids flicker since selectors already trigger rerenders. ([L276](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/chat-screen/ChatScreen.tsx#L276))
- ChatScreen measures the long-pressed message so ReactionPopup can render a copy of it at the same position above the dimmed background in the portal. ([L455](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/chat-screen/ChatScreen.tsx#L455))
- ChatScreen passes chatMessages to rows only for group chats so 1:1 rows do not rerender on every new message. ([L474](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/chat-screen/ChatScreen.tsx#L474))
- ChatScreen hides the original message's reaction while the reaction popup is open so it does not show underneath the cloned message in the portal. ([L477](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/chat-screen/ChatScreen.tsx#L477))
- The chat message list is newest first (inverted), so a message's older neighbor used for sender-run grouping is at index + 1. ([L490](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/chat-screen/ChatScreen.tsx#L490))
- handleMessageSent defers scrollToOffset with setTimeout 0 so the list has rendered the new message and has its final height before scrolling. ([L548](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/chat-screen/ChatScreen.tsx#L548))
- ChatScreen initialNumToRender covers the earliest unread message plus a buffer without rendering the whole cached history. ([L619](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/chat-screen/ChatScreen.tsx#L619))
- ChatScreen wraps EmptyChatMessages in a View inside ListEmptyComponent to avoid React Native's inverted FlatList empty component bug (facebook/react-native#21196) instead of a rotation transform that would break once fixed. ([L634](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/chat-screen/ChatScreen.tsx#L634))
- ChatScreen is wrapped in withManagedAccountRestriction because DMs act as the signed-in wallet. ([L689](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/chat-screen/ChatScreen.tsx#L689))

### `src/screens/chat-screen/ChatUserListScreen.tsx`

- ChatUserListScreen is wrapped in withManagedAccountRestriction because DMs act as the signed-in wallet. ([L412](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/chat-screen/ChatUserListScreen.tsx#L412))

### `src/screens/chat-screen/ReactionPopup.tsx`

- ReactionPopup stores the chosen reaction in a ref and dispatches it on close, after the unmount animation, to prevent jitter. ([L149](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/chat-screen/ReactionPopup.tsx#L149))

### `src/screens/create-chat-blast-screen/ChatBlastSelectAudienceScreen.tsx`

- ChatBlastSelectAudienceScreen disables Continue when defaultAudience is empty because that means no users exist in any blast audience. ([L30](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/create-chat-blast-screen/ChatBlastSelectAudienceScreen.tsx#L30))

### `src/screens/root-screen/RootScreen.tsx`

- RootScreen defers the chat socket connect and chat list fetch until after startup interactions since the first screen doesn't need them, while fetchUnreadMessagesCount runs immediately to populate the unread badge. ([L134](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/root-screen/RootScreen.tsx#L134))
