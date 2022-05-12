import logging
from datetime import datetime
from typing import List, Tuple, TypedDict, Union, cast

from sqlalchemy import func, or_
from sqlalchemy.orm import Query, aliased
from sqlalchemy.orm.session import Session
from src.models import AggregateUser, AggregateUserTips, Follow, User, UserTip
from src.queries.get_unpopulated_users import get_unpopulated_users
from src.queries.query_helpers import paginate_query, populate_user_metadata
from src.utils.db_session import get_db_read_replica

logger = logging.getLogger(__name__)


class GetTipsArgs(TypedDict):
    limit: int
    offset: int
    user_id: int
    receiver_min_followers: int
    receiver_is_verified: bool
    current_user_follows: str
    unique_by: str
    min_slot: int
    tx_signatures: List[int]


class TipResult(TypedDict):
    amount: int
    sender: str
    receiver: str
    slot: int
    created_at: datetime
    followee_supporters: List[str]
    tx_signature: str


# Example of query with inputs:
# limit=100, offset=0, user_id=1, current_user_follows=sender_or_receiver
# ---------------------------------------------------------
# WITH followees AS
# (
#     SELECT
#         follows.followee_user_id AS followee_user_id
#     FROM
#         follows
#     WHERE
#         follows.is_current = true
#         AND follows.is_delete = false
#         AND follows.follower_user_id = 1
# )
# ,
# tips AS
# (
#     SELECT
#         user_tips.signature AS signature,
#         user_tips.slot AS slot,
#         user_tips.sender_user_id AS sender_user_id,
#         user_tips.receiver_user_id AS receiver_user_id,
#         user_tips.amount AS amount,
#         user_tips.created_at AS created_at
#     FROM
#         user_tips
#         LEFT OUTER JOIN
#             followees AS followees_for_receiver
#             ON user_tips.receiver_user_id = followees_for_receiver.followee_user_id
#         LEFT OUTER JOIN
#             followees AS followees_for_sender
#             ON user_tips.sender_user_id = followees_for_sender.followee_user_id
#     WHERE
#         followees_for_receiver.followee_user_id IS NOT NULL
#         OR followees_for_sender.followee_user_id IS NOT NULL
#     ORDER BY
#         user_tips.slot DESC LIMIT 100 OFFSET 0
# )
# ,
# followee_tippers AS
# (
#     SELECT
#         aggregate_user_tips.sender_user_id AS sender_user_id,
#         aggregate_user_tips.receiver_user_id AS receiver_user_id,
#         followees_for_aggregate.followee_user_id AS followee_user_id
#     FROM
#         followees AS followees_for_aggregate
#         LEFT OUTER JOIN
#             aggregate_user_tips
#             ON aggregate_user_tips.sender_user_id = followees_for_aggregate.followee_user_id
# )
# SELECT
#     tips.signature AS tips_signature,
#     tips.slot AS tips_slot,
#     tips.sender_user_id AS tips_sender_user_id,
#     tips.receiver_user_id AS tips_receiver_user_id,
#     tips.amount AS tips_amount,
#     tips.created_at AS tips_created_at,
#     array_agg(followee_tippers.sender_user_id) AS array_agg_1
# FROM
#     tips
#     LEFT OUTER JOIN
#         followee_tippers
#         ON followee_tippers.receiver_user_id = tips.receiver_user_id
# GROUP BY
#     tips.signature,
#     tips.slot,
#     tips.sender_user_id,
#     tips.receiver_user_id,
#     tips.amount,
#     tips.created_at
# ORDER BY
#     tips.slot DESC LIMIT 100 OFFSET 0;
#


def _get_tips(session: Session, args: GetTipsArgs):
    UserTipAlias = aliased(UserTip)
    query: Query = session.query(UserTipAlias)
    if args.get("tx_signatures"):
        query = query.filter(UserTipAlias.signature.in_(args["tx_signatures"]))
    if args.get("receiver_min_followers", 0) > 0:
        query = query.join(
            AggregateUser, AggregateUser.user_id == UserTipAlias.receiver_user_id
        ).filter(AggregateUser.follower_count >= args["receiver_min_followers"])

    if args.get("receiver_is_verified", False):
        query = query.join(User, User.user_id == UserTipAlias.receiver_user_id).filter(
            User.is_current == True, User.is_verified == True
        )
    if args.get("min_slot", 0) > 0:
        query = query.filter(UserTipAlias.slot >= args["min_slot"])
    if args.get("unique_by"):
        if args["unique_by"] == "sender":
            distinct_inner = (
                query.order_by(
                    UserTipAlias.sender_user_id.asc(), UserTipAlias.slot.desc()
                )
                .distinct(UserTipAlias.sender_user_id)
                .subquery()
            )
            UserTipAlias = aliased(UserTip, distinct_inner, name="user_tips_uniqued")
            query = session.query(UserTipAlias)
        elif args["unique_by"] == "receiver":
            distinct_inner = (
                query.order_by(
                    UserTipAlias.receiver_user_id.asc(), UserTipAlias.slot.desc()
                )
                .distinct(UserTipAlias.receiver_user_id)
                .subquery()
            )
            UserTipAlias = aliased(UserTip, distinct_inner, name="user_tips_uniqued")
            query = session.query(UserTipAlias)

    if args.get("user_id"):
        # We have to get the other users that this user follows for three potential uses:
        # 1) To filter tips to recipients the user follows (if necessary)
        # 2) To filter tips to senders the user follows (if necessary)
        # 3) To get the followees of the current user that have also tipped the receiver
        followees_query = (
            session.query(Follow.followee_user_id)
            .filter(
                Follow.is_current == True,
                Follow.is_delete == False,
                Follow.follower_user_id == args["user_id"],
            )
            .cte("followees")
        )
        # First, filter the senders/receivers as necessary
        if args.get("current_user_follows"):
            FolloweesSender = aliased(followees_query, name="followees_for_sender")
            FolloweesReceiver = aliased(followees_query, name="followees_for_receiver")
            if args["current_user_follows"] == "receiver":
                query = query.join(
                    FolloweesReceiver,
                    UserTipAlias.receiver_user_id
                    == FolloweesReceiver.c.followee_user_id,
                )
            elif args["current_user_follows"] == "sender":
                query = query.join(
                    FolloweesSender,
                    UserTipAlias.receiver_user_id == FolloweesSender.c.followee_user_id,
                )
            elif args["current_user_follows"] == "sender_or_receiver":
                query = query.outerjoin(
                    FolloweesSender,
                    UserTipAlias.sender_user_id == FolloweesSender.c.followee_user_id,
                )
                query = query.outerjoin(
                    FolloweesReceiver,
                    UserTipAlias.receiver_user_id
                    == FolloweesReceiver.c.followee_user_id,
                )
                query = query.filter(
                    or_(
                        FolloweesSender.c.followee_user_id != None,
                        FolloweesReceiver.c.followee_user_id != None,
                    )
                )

        # Order and paginate before adding follower filters/aggregates
        query = query.order_by(UserTipAlias.slot.desc())
        query = paginate_query(query)

        # Get the tips for the user as a subquery
        # because now we need to get the other users that tipped that receiver
        # and joining on this already paginated/limited result will be much faster
        Tips = query.cte("tips")
        FolloweesAggregate = aliased(followees_query, name="followees_for_aggregate")

        # Get all of the followees joined on their aggregate user tips first
        # rather than joining each on the tips separately to help with speed
        FolloweeTippers = (
            session.query(
                AggregateUserTips.sender_user_id,
                AggregateUserTips.receiver_user_id,
                FolloweesAggregate.c.followee_user_id,
            )
            .select_from(FolloweesAggregate)
            .outerjoin(
                AggregateUserTips,
                AggregateUserTips.sender_user_id
                == FolloweesAggregate.c.followee_user_id,
            )
            .cte("followee_tippers")
        )
        # Now we have the tips listed multiple times, one for each followee sender.
        # So group by the tip and aggregate up the followee sender IDs into a list
        query = (
            session.query(UserTip, func.array_agg(FolloweeTippers.c.sender_user_id))
            .select_entity_from(Tips)
            .outerjoin(
                FolloweeTippers,
                FolloweeTippers.c.receiver_user_id == Tips.c.receiver_user_id,
            )
            .group_by(Tips)
        )

    query = query.order_by(UserTipAlias.slot.desc())
    query = paginate_query(query)

    tips_results: List[UserTip] = query.all()
    return tips_results


def get_tips(args: GetTipsArgs) -> List[TipResult]:
    db = get_db_read_replica()
    with db.scoped_session() as session:
        results: Union[List[Tuple[UserTip, List[str]]], List[UserTip]] = _get_tips(
            session, args
        )
        tips_results: List[Tuple[UserTip, List[str]]] = []
        # Wrap in tuple for consistency
        if isinstance(results[0], UserTip):
            tips_results = [(cast(UserTip, tip), []) for tip in results]
        else:
            # MyPy doesn't seem smart enough to figure this out, help it with a cast
            tips_results = cast(List[Tuple[UserTip, List[str]]], results)

        # Collect user IDs and fetch users
        user_ids = set()
        for result in tips_results:
            user_ids.add(result[0].sender_user_id)
            user_ids.add(result[0].receiver_user_id)
        users = get_unpopulated_users(session, user_ids)
        users = populate_user_metadata(
            session, user_ids, users, args["user_id"] if "user_id" in args else None
        )
        users_map = {}
        for user in users:
            users_map[user["user_id"]] = user

        # Not using model_to_dictionary() here because TypedDict complains about dynamic keys
        tips: List[TipResult] = [
            {
                "amount": result[0].amount,
                "sender": users_map[result[0].sender_user_id],
                "receiver": users_map[result[0].receiver_user_id],
                "followee_supporters": list(
                    filter(
                        lambda id: id is not None,
                        result[1],
                    )
                ),
                "slot": result[0].slot,
                "created_at": result[0].created_at,
                "tx_signature": result[0].signature,
            }
            for result in tips_results
        ]
        return tips
