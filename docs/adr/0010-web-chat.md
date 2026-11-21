# 0010. Chat and DMs on web

- Status: Accepted
- Date: 2026-11-21

## Context

Inbox, chat composer, blasts and group chat behaviour in the web client. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `src/components/share-modal/ShareModal.tsx`

- ShareModal disables DM sharing in manager mode because a managed user can't send DMs. ([L176](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/share-modal/ShareModal.tsx#L176))

### `src/pages/chat-page/ChatPage.tsx`

- ChatPage only collapses the chat list once chats have loaded and are empty, keeping it during LOADING/IDLE so skeletons render without layout shift. ([L108](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/ChatPage.tsx#L108))

### `src/pages/chat-page/components/ChatBlastAudienceDisplay.tsx`

- ChatBlastAudienceDisplay fetches one user beyond the limit so the overflow count has a background photo. ([L45](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatBlastAudienceDisplay.tsx#L45))

### `src/pages/chat-page/components/ChatBlastModal.tsx`

- ChatBlastModal disables Continue when there is no default audience because that means no audience has any users. ([L151](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatBlastModal.tsx#L151))

### `src/pages/chat-page/components/ChatList.tsx`

- ChatList keeps fetching older pages until a tab has at least 10 chats, because chats paginate by recency across all inbox categories. ([L36](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatList.tsx#L36))
- ChatList stops backfilling after 5 pages per tab visit so a mostly empty tab does not page through all chat history. ([L42](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatList.tsx#L42))
- ChatList shows the empty state only once there is nothing left to load, since the InfiniteScroll loader shows skeletons until then. ([L86](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatList.tsx#L86))

### `src/pages/chat-page/components/ChatMessageList.tsx`

- ChatMessageList filters messages from blocked users in group chats because groups can include people you blocked. ([L83](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatMessageList.tsx#L83))
- ChatMessageList keeps the chat in a ref so the unread separator does not vanish when the chat is marked read, avoiding flicker from state updates. ([L112](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatMessageList.tsx#L112))
- ChatMessageList cancels the throttled scroll handler only when the handler changes or on unmount; without the dep array the cleanup ran every render and cancelled in-flight calls. ([L171](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatMessageList.tsx#L171))
- ChatMessageList snaps to the bottom when the message list content resizes and the user was near the bottom, covering avatar loads and unfurls that do not change the messages array and so miss StickyScrollList's stickToBottom. ([L181](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatMessageList.tsx#L181))
- ChatMessageList cannot scroll to the unread indicator on initial render, so the ref callback stores the element in state to trigger a rerender and scroll then. ([L216](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatMessageList.tsx#L216))
- ChatMessageList sets lastScrolledChatId after auto-scrolling to the unread indicator so the chat stays unread until the user scrolls to the bottom themselves. ([L233](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatMessageList.tsx#L233))
- ChatMessageList auto-fetches more messages when the first page does not fill the view, guarded per (chatId, prev count) so rerenders do not dispatch duplicate fetches while one is in flight. ([L255](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatMessageList.tsx#L255))

### `src/pages/chat-page/components/ChatMessagePlaylist.tsx`

- ChatMessagePlaylist reads the permalink lookup query directly because useCollectionByPermalink stays pending forever when the permalink resolves to no collection, so the skeleton would never end. ([L32](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatMessagePlaylist.tsx#L32))
- ChatMessagePlaylist waits for the permalink query to resolve before calling onSuccess/onEmpty so the URL text does not flash before the tile or empty state. ([L72](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatMessagePlaylist.tsx#L72))
- When a collection URL resolves to nothing playable, ChatMessagePlaylist calls onEmpty so the bubble shows bare URL text instead of a misleading preview. ([L78](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatMessagePlaylist.tsx#L78))
- ChatMessagePlaylist renders the mobile web CollectionTile on desktop because the chat playlist tile shares the mobile web design. ([L90](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatMessagePlaylist.tsx#L90))

### `src/pages/chat-page/components/ChatMessageTrack.tsx`

- ChatMessageTrack reads the permalink lookup query directly because useTrackByPermalink stays pending forever when the permalink resolves to no track, so the skeleton would never end. ([L49](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatMessageTrack.tsx#L49))
- ChatMessageTrack waits for the permalink query to resolve before calling onSuccess/onEmpty so the URL text does not flash before the tile or empty state. ([L91](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatMessageTrack.tsx#L91))
- When a track URL resolves to nothing playable, ChatMessageTrack calls onEmpty so the bubble shows bare URL text instead of a misleading preview. ([L97](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatMessageTrack.tsx#L97))
- ChatMessageTrack renders the mobile web TrackTile on desktop because the chat track tile shares the mobile web design. ([L109](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatMessageTrack.tsx#L109))

### `src/pages/chat-page/components/CreateChatModal.tsx`

- CreateChatModal marks selection full at MAX_GROUP_CHAT_MEMBERS - 1 because the current user takes one of the group slots. ([L132](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/CreateChatModal.tsx#L132))

### `src/pages/chat-page/components/CreateChatPrompt.tsx`

- CreateChatPrompt accepts hasChats to override its chats selector so ChatPage can keep it in sync with the sidebar's visibility when the account has no chats. ([L21](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/CreateChatPrompt.tsx#L21))

### `src/pages/chat-page/components/LinkPreview.tsx`

- LinkPreview defers parent callbacks until unfurl metadata is fetched so the URL text does not flash before the preview. ([L31](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/LinkPreview.tsx#L31))
- LinkPreview guards new URL on unfurl-provided urls, which may not be fully qualified, falling back to the user's href, because a throw would crash the whole ChatMessageList render. ([L37](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/LinkPreview.tsx#L37))
