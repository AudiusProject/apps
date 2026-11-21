import { FollowSource, ID } from '@audius/common/models'
import { usersSocialActions as socialActions } from '@audius/common/store'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'

import { AppState } from 'store/types'

import UnfollowConfirmationModal from './components/UnfollowConfirmationModal'
import * as actions from './store/actions'
import { getIsOpen, getUserId } from './store/selectors'

type UnfollowConfirmationModalProps = ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps>

const ConnectedUnfollowConfirmationModal = ({
  isOpen,
  userId,
  onClose,
  onUnfollow
}: UnfollowConfirmationModalProps) => {
  return (
    <UnfollowConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      unfollowUser={onUnfollow}
      userId={userId || -1}
    />
  )
}

function mapStateToProps(state: AppState) {
  return {
    isOpen: getIsOpen(state),
    userId: getUserId(state)
  }
}

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    onUnfollow: (id: ID) => {
      dispatch(socialActions.unfollowUser(id, FollowSource.USER_LIST))
    },
    onClose: () => dispatch(actions.setClosed())
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ConnectedUnfollowConfirmationModal)
