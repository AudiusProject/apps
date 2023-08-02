import logging

from sqlalchemy.orm.session import Session

from src.models.social.follow import Follow
from src.models.users.aggregate_user_tips import AggregateUserTip
from src.models.users.usdc_purchase import USDCPurchase

logger = logging.getLogger(__name__)


def does_user_have_nft_collection(**kwargs):
    # Return False here as we want to avoid this check here, in favor of
    # calling the /tracks/<user-id>/nft-gated-signatures endpoint to check
    # whether a user has access to nft-gated tracks.
    return False


def does_user_follow_artist(
    session: Session, user_id: int, condition_options: int, **kwargs
):
    follow_user_id = condition_options
    result = (
        session.query(Follow)
        .filter(Follow.is_current == True)
        .filter(Follow.is_delete == False)
        .filter(Follow.follower_user_id == user_id)
        .filter(Follow.followee_user_id == follow_user_id)
        .one_or_none()
    )
    return True if result else False


def does_user_support_artist(
    session: Session, user_id: int, condition_options: int, **kwargs
):
    supporting_user_id = condition_options
    result = (
        session.query(AggregateUserTip)
        .filter(AggregateUserTip.sender_user_id == user_id)
        .filter(AggregateUserTip.receiver_user_id == supporting_user_id)
        .filter(AggregateUserTip.amount >= 0)
        .first()
    )
    return True if result else False


def has_user_purchased_content(
    session: Session,
    user_id: int,
    content_id: int,
    content_type: str,
    **kwargs,
):
    result = (
        session.query(USDCPurchase)
        .filter(
            USDCPurchase.buyer_user_id == user_id,
            USDCPurchase.content_id == content_id,
            USDCPurchase.content_type == content_type,
        )
        .first()
    )
    return True if result else False
