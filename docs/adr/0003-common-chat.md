# 0003. Chat and DMs in common

- Status: Accepted
- Date: 2026-11-21

## Context

Inbox categories, unread counts, pagination, permissions, blasts and group chats. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `hooks/chats/useAudiusLinkResolver.ts`

- useAudiusLinkResolver.resolveLinks catches sdk.resolve failures (e.g. contest page URLs) and leaves the URL as a literal link instead of failing the whole input. ([L124](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/chats/useAudiusLinkResolver.ts#L124))
- useAudiusLinkResolver.resolveLinks waits 500ms when the linked entity was already loaded so the user perceives the link being converted. ([L167](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/chats/useAudiusLinkResolver.ts#L167))
- useAudiusLinkResolver replaces links sorted by length descending so a longer URL (artist/track) is replaced before its prefix (artist). ([L173](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/chats/useAudiusLinkResolver.ts#L173))

### `hooks/chats/useCanSendMessage.ts`

- useCanSendMessage always allows sending in group chats because blocks in groups only hide messages for the blocking reader rather than preventing posting. ([L42](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/chats/useCanSendMessage.ts#L42))

### `store/pages/chat/category.test.ts`

- The chat category test (pages/chat/category.test.ts) models a concurrent list refetch returning a stale chat; the server always sends explicit null for uncategorized, which must not overwrite an optimistic category. ([L195](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/category.test.ts#L195))
- In category.test.ts, without server counts the unread fallback scan must continue past blast chats rather than stop on them. ([L399](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/category.test.ts#L399))

### `store/pages/chat/middleware.ts`

- In chat middleware.ts, incoming blast messages are only added locally when the current user sent them, because blast UI is sender-only. ([L64](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/middleware.ts#L64))
- In chat middleware.ts the WebSocket error listener only logs errors with a code; most errors lack one and are not actionable. ([L95](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/middleware.ts#L95))

### `store/pages/chat/sagas.ts`

- fetchUnreadMessagesCountByCategory (chat/sagas.ts) treats failure as non-fatal because older nodes do not serve it; the inbox tab dots fall back to loaded chats. ([L130](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/sagas.ts#L130))
- createChat saga (chat/sagas.ts) gives group chats a new random id unless a chat with exactly the same members already exists; 1:1 chats use the deterministic member-derived id. ([L414](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/sagas.ts#L414))
- On a 403 when creating a 1:1 chat (chat/sagas.ts), blockees, blockers and permissions are refetched so InboxUnavailable shows the right next action. ([L459](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/sagas.ts#L459))
- doMarkChatAsRead (chat/sagas.ts) uses the non-optimistic chat so the mark-as-read decision is consistent with backend values. ([L556](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/sagas.ts#L556))
- doMarkAllChatsAsRead (chat/sagas.ts) relies on one server UPDATE clearing all unread counts, then fetchUnreadMessagesCount reconciles the badge for chats not in local state. ([L573](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/sagas.ts#L573))
- doDeleteChat (chat/sagas.ts) navigates away and waits a tick before deleteChatSucceeded; deleting first makes the open chat screen refetch it immediately. ([L819](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/sagas.ts#L819))
- setChatCategory saga (chat/sagas.ts) skips blast chats because they are synthetic client-side chats the server cannot categorize. ([L950](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/sagas.ts#L950))

### `store/pages/chat/selectors.ts`

- getPriorityInboxChats (chat/selectors.ts) shows chats marked Priority, or uncategorized chats the user has replied in. ([L152](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/selectors.ts#L152))
- getGeneralInboxChats (chat/selectors.ts) shows chats marked General or never replied to. ([L155](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/selectors.ts#L155))
- getHasUnreadMessagesForInboxTab (chat/selectors.ts) prefers server per-category counts, which cover unpaginated chats, and falls back to scanning loaded chats. ([L163](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/selectors.ts#L163))
- In getHasUnreadMessagesForInboxTab, older api versions do not report uncategorized_unreplied, so their uncategorized chats count toward Priority. ([L174](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/selectors.ts#L174))
- getHasUnreadMessages (chat/selectors.ts) falls back to scanning chats when the count is out of sync, skipping blasts which have no unread count. ([L203](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/selectors.ts#L203))
- The chat permission selector (chat/selectors.ts) treats an existing 1:1 chat with an unblocked user as permission to keep chatting; this only works if that chat is already fetched. ([L328](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/selectors.ts#L328))
- In chat/selectors.ts permission check, only 1:1 chats count as an existing conversation; sharing a group chat grants no DM permission. ([L333](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/selectors.ts#L333))

### `store/pages/chat/slice.ts`

- ChatState.unreadMessagesCountByCategory (chat/slice.ts) stays undefined until the server answers or if unsupported, and per-tab dots then fall back to loaded chats. ([L54](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/slice.ts#L54))
- applyUnreadCountDelta (chat/slice.ts) leaves buckets the server did not report (older api versions) absent instead of creating them. ([L130](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/slice.ts#L130))
- recalculatePreviousMessageHasTail (chat/slice.ts) recalculates index + 1 because messages are stored newest-first, so that entry is the previous message. ([L168](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/slice.ts#L168))
- When upserting a chat (chat/slice.ts), an empty messages entry is created so ChatScreen/ChatMessagesList show the "Say Hi" empty state. ([L237](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/slice.ts#L237))
- markAllChatsAsRead (chat/slice.ts) only optimistically clears loaded non-blast chats; unloaded chats are cleared server-side by chat.read_all and reconcile via fetchUnreadMessagesCount. ([L569](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/slice.ts#L569))
- markAllChatsAsReadSucceeded (chat/slice.ts) promotes optimistic reads to entities; unreadMessagesCount is left for the saga's trailing fetchUnreadMessagesCount to overwrite. ([L594](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/slice.ts#L594))
- markAllChatsAsReadFailed (chat/slice.ts) undoes every optimistic read because chat.read_all is all-or-nothing. ([L623](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/slice.ts#L623))
- addMessage (chat/slice.ts) does not bump last_message_at for plaintext (blast-origin) messages the current user sent, to avoid re-sorting the chat list. ([L659](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/slice.ts#L659))
- addMessage (chat/slice.ts) returns early for already-seen messages so recheck_permissions is only cleared for new messages from others. ([L686](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/slice.ts#L686))
- addMessage (chat/slice.ts) skips incrementing unread_message_count for the active chat because it will be marked read immediately, preventing flicker. ([L718](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/slice.ts#L718))
- addMessage (chat/slice.ts) sets has_replied on own non-plaintext messages so an uncategorized chat moves to Priority; plaintext blast copies are not replies. ([L748](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/slice.ts#L748))
- setActiveChat (chat/slice.ts) marks the chat being read so incoming messages do not flash it as unread. ([L758](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/slice.ts#L758))
- setReactionsPopupMessageId (chat/slice.ts) is not keyed by chatId because mobile shows at most one reactions popup at a time. ([L829](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/slice.ts#L829))
- setChatCategory (chat/slice.ts) optimistically moves the chat and its unread counts to the new category so it switches tabs immediately. ([L878](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/slice.ts#L878))
- setChatCategorySucceeded (chat/slice.ts) re-asserts the confirmed category because a concurrent chat refetch may have overwritten the optimistic value with stale server data. ([L909](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/slice.ts#L909))

### `store/pages/chat/types.ts`

- InboxTab (chat/types.ts): Priority holds chats filed there or replied in, General holds the rest; see getInboxTabForChat. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/types.ts#L3))

### `store/pages/chat/utils.ts`

- The Categorizable type (chat/utils.ts) includes is_blast so blast chats, which carry no category, satisfy it without a cast. ([L7](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/utils.ts#L7))
- getChatCategoryKeys (chat/utils.ts) puts uncategorized never-replied chats in both uncategorized and uncategorized_unreplied buckets. ([L15](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/utils.ts#L15))
- getInboxTabForChat (chat/utils.ts): explicit category wins; otherwise replied chats are Priority, others General; sent blasts and chats from an api without has_replied stay Priority. ([L26](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/utils.ts#L26))
- MAX_GROUP_CHAT_MEMBERS (chat/utils.ts) is 10 including the creator and must match the api's limit. ([L45](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/chat/utils.ts#L45))
