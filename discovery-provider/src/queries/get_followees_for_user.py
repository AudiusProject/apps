from sqlalchemy import func, desc
from sqlalchemy.orm import aliased

from src.models import User, Follow
from src.utils import helpers
from src.utils.db_session import get_db_read_replica
from src.queries import response_name_constants
from src.queries.query_helpers import get_current_user_id, populate_user_metadata, \
    paginate_query


def get_followees_for_user(follower_user_id):
    users = []
    db = get_db_read_replica()
    with db.scoped_session() as session:
        # correlated subquery sqlalchemy code:
        # https://groups.google.com/forum/#!topic/sqlalchemy/WLIy8jxD7qg
        inner_follow = aliased(Follow)
        outer_follow = aliased(Follow)

        # subquery to get a user's follower count
        inner_select = (
            session.query(
                func.count(inner_follow.followee_user_id)
            )
            .filter(
                inner_follow.followee_user_id == outer_follow.followee_user_id,
                inner_follow.is_current == True,
                inner_follow.is_delete == False
            )
            .correlate(outer_follow)
        )

        # get all users followed by input user, sorted by their follower count desc
        outer_select = (
            session.query(
                outer_follow.followee_user_id,
                inner_select.as_scalar().label(response_name_constants.follower_count)
            )
            .filter(
                outer_follow.follower_user_id == follower_user_id,
                outer_follow.is_current == True,
                outer_follow.is_delete == False
            )
            .group_by(outer_follow.followee_user_id)
            .order_by(desc(response_name_constants.follower_count))
        )
        followee_user_ids_by_follower_count = paginate_query(
            outer_select).all()

        user_ids = [user_id for (user_id, follower_count)
                    in followee_user_ids_by_follower_count]

        # get all users for above user_ids
        users = (
            session.query(User)
            .filter(
                User.is_current == True,
                User.user_id.in_(user_ids)
            )
            .all()
        )
        users = helpers.query_result_to_list(users)

        current_user_id = get_current_user_id(required=False)

        # bundle peripheral info into user results
        users = populate_user_metadata(
            session, user_ids, users, current_user_id)

        # order by follower_count desc
        users.sort(
            key=lambda user: user[response_name_constants.follower_count],
            reverse=True
        )

    return users
