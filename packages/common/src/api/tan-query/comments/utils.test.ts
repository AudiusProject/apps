import { describe, expect, it } from 'vitest'

import { getCommentSectionLoading } from './utils'

describe('getCommentSectionLoading', () => {
  it('does not show the loading state when the comment count is known to be zero', () => {
    expect(
      getCommentSectionLoading({
        commentCount: 0,
        isLoadingMorePages: false,
        status: 'pending'
      })
    ).toBe(false)
  })

  it('shows the loading state while the initial comment list is pending for non-empty counts', () => {
    expect(
      getCommentSectionLoading({
        commentCount: 1,
        isLoadingMorePages: false,
        status: 'pending'
      })
    ).toBe(true)
  })

  it('does not show the loading state while loading additional pages', () => {
    expect(
      getCommentSectionLoading({
        commentCount: 1,
        isLoadingMorePages: true,
        status: 'pending'
      })
    ).toBe(false)
  })
})
