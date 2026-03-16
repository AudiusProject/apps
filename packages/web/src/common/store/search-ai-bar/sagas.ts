import {
  limitAutocompleteResults,
  searchResultsFromSDK
} from '@audius/common/adapters'
import { Name } from '@audius/common/models'
import { queryCurrentUserId } from '@audius/common/src/api'
import { SearchKind, getSDK } from '@audius/common/store'
import { OptionalId } from '@audius/sdk/services'
import { call, cancel, fork, put, race, select, take } from 'typed-redux-saga'

import { make } from 'common/store/analytics/actions'
import { waitForRead } from 'utils/sagaHelpers'

import * as searchActions from './actions'
import { getSearch } from './selectors'

function* getSearchResults(searchText: string) {
  yield* waitForRead()

  const sdk = yield* getSDK()
  const userId = yield* call(queryCurrentUserId)

  const { data } = yield* call([sdk.search, sdk.search.searchAutocomplete], {
    userId: OptionalId.parse(userId),
    query: searchText,
    limit: 10,
    offset: 0,
    kind: SearchKind.USERS
  })
  const results = limitAutocompleteResults(searchResultsFromSDK(data))

  const { users } = results
  const checkedUsers = users.filter((u) => !u.is_deactivated)
  return {
    users: checkedUsers
  }
}

function* fetchSearchAsync(action: searchActions.FetchSearchAction) {
  yield* call(waitForRead)
  yield* put(searchActions.fetchSearchRequested(action.searchText))
  const search = yield* select(getSearch)
  if (action.searchText === search.searchText) {
    const previousResults = {
      users: search.users
    }
    yield* put(
      searchActions.fetchSearchSucceeded(previousResults, search.searchText)
    )
  } else {
    const results = yield* call(getSearchResults, action.searchText)
    if (results) {
      yield* put(searchActions.fetchSearchSucceeded(results, action.searchText))
      yield* put(
        make(Name.SEARCH_SEARCH, {
          term: action.searchText,
          source: 'autocomplete'
        })
      )
    } else {
      yield* put(searchActions.fetchSearchFailed(action.searchText))
    }
  }
}

function* watchSearch() {
  let lastTask
  while (true) {
    const { searchAction, cancelSearch } = yield* race({
      searchAction: take<searchActions.FetchSearchAction>(
        searchActions.FETCH_SEARCH
      ),
      cancelSearch: take(searchActions.CANCEL_FETCH_SEARCH)
    })
    if (lastTask) {
      // cancel is no-op if the task has already terminated
      yield* cancel(lastTask)
    }
    if (!cancelSearch && searchAction) {
      lastTask = yield* fork(fetchSearchAsync, searchAction)
    }
  }
}

export default function sagas() {
  const sagas = [watchSearch]
  return sagas
}
