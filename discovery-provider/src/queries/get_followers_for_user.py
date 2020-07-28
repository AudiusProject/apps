from sqlalchemy import func, asc, desc
from sqlalchemy.orm import aliased

from src.models import User, Follow
from src.utils import helpers
from src.utils.db_session import get_db_read_replica
from src.queries import response_name_constants
from src.queries.query_helpers import get_current_user_id, populate_user_metadata, \
    paginate_query


def get_followers_for_user(followee_user_id):
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
                inner_follow.is_current == True,
                inner_follow.is_delete == False,
                inner_follow.followee_user_id == outer_follow.follower_user_id
            )
            .correlate(outer_follow)
        )

        # get all users that follow input user, sorted by their follower count desc
        outer_select = (
            session.query(
                outer_follow.follower_user_id,
                inner_select.as_scalar().label(response_name_constants.follower_count)
            )
            .filter(
                outer_follow.followee_user_id == followee_user_id,
                outer_follow.is_current == True,
                outer_follow.is_delete == False
            )
            .group_by(outer_follow.follower_user_id)
            .order_by(
                desc(response_name_constants.follower_count),
                # secondary sort to guarantee determinism as explained here:
                # https://stackoverflow.com/questions/13580826/postgresql-repeating-rows-from-limit-offset
                asc(outer_follow.follower_user_id)
            )
        )
        follower_user_ids_by_follower_count = paginate_query(
            outer_select).all()

        user_ids = [user_id for (user_id, follower_count)
                    in follower_user_ids_by_follower_count]

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

        # order by (follower_count desc, user_id asc) to match query sorting
        # tuple key syntax from: https://stackoverflow.com/a/4233482/8414360
        users.sort(
            key=lambda user: (
                user[response_name_constants.follower_count], (user['user_id'])*(-1)),
            reverse=True
        )
    return users
