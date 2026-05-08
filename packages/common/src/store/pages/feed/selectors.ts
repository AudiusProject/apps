import { CommonState } from '~/store/commonStore'

export const getFeedFilter = (state: CommonState) => state.pages.feed.feedFilter

export const getFeedTab = (state: CommonState) => state.pages.feed.feedTab
