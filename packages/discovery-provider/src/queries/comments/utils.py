import logging

from sqlalchemy import func

from src.models.comments.comment_mention import CommentMention
from src.models.comments.comment_notification_setting import CommentNotificationSetting
from src.models.comments.comment_reaction import CommentReaction
from src.models.comments.comment_report import COMMENT_KARMA_THRESHOLD
from src.models.moderation.muted_user import MutedUser
from src.models.comments.comment import FAN_CLUB_ENTITY_TYPE
from src.models.users.aggregate_user import AggregateUser
from src.models.users.user import User
from src.queries.query_helpers import get_tracks, get_users
from src.utils.db_session import get_db_read_replica
from src.utils.helpers import encode_int_id

logger = logging.getLogger(__name__)

# Constants
COMMENT_ROOT_DEFAULT_LIMIT = 15  # default pagination limit
COMMENT_REPLIES_DEFAULT_LIMIT = 3  # default replies pagination limit


# Returns whether a comment has been reacted to by a particular user
def get_is_reacted(session, user_id, comment_id):
    if not user_id:
        return False
    is_react = (
        session.query(CommentReaction)
        .filter(
            CommentReaction.user_id == user_id,
            CommentReaction.comment_id == comment_id,
            CommentReaction.is_delete == False,
        )
        .first()
    )
    return is_react is not None


def get_base_comments_query(session, current_user_id=None):
    """Base query builder for comments with common functionality"""
    mentioned_users = (
        session.query(
            CommentMention.comment_id,
            CommentMention.user_id,
            User.handle,
            CommentMention.is_delete,
        )
        .join(User, CommentMention.user_id == User.user_id)
        .subquery()
    )

    react_count_subquery = (
        session.query(
            CommentReaction.comment_id,
            func.count(CommentReaction.comment_id).label("react_count"),
        )
        .filter(CommentReaction.is_delete == False)
        .group_by(CommentReaction.comment_id)
        .subquery()
    )

    muted_by_karma = (
        session.query(MutedUser.muted_user_id)
        .join(AggregateUser, MutedUser.user_id == AggregateUser.user_id)
        .filter(MutedUser.is_delete == False)
        .group_by(MutedUser.muted_user_id)
        .having(func.sum(AggregateUser.follower_count) >= COMMENT_KARMA_THRESHOLD)
        .subquery()
    )

    return {
        "mentioned_users": mentioned_users,
        "react_count_subquery": react_count_subquery,
        "muted_by_karma": muted_by_karma,
    }


def get_reactions_batch(session, comment_ids, user_ids):
    """
    Batch fetch reactions for multiple comments and users.

    Args:
        session: Database session
        comment_ids: List of comment IDs to check reactions for
        user_ids: List of user IDs to check reactions from

    Returns:
        Dict mapping (user_id, comment_id) tuples to boolean indicating if reacted
    """
    if not comment_ids or not user_ids:
        return {}

    reactions = (
        session.query(CommentReaction.user_id, CommentReaction.comment_id)
        .filter(
            CommentReaction.comment_id.in_(comment_ids),
            CommentReaction.user_id.in_(user_ids),
            CommentReaction.is_delete == False,
        )
        .all()
    )

    # Create a mapping of (user_id, comment_id) -> True for existing reactions
    return {(r.user_id, r.comment_id): True for r in reactions}


def _format_comment_response(
    comment,
    react_count,
    is_muted,
    mentions,
    current_user_id,
    session,
    artist_id=None,
    replies=None,
    reactions_map=None,
):
    """Common formatter for comment responses"""

    def remove_delete(mention):
        del mention["is_delete"]
        return mention

    def filter_mentions(mention):
        return mention["user_id"] is not None and mention["is_delete"] is not True

    # Helper to check reactions from the pre-fetched map
    def is_reacted(user_id, comment_id):
        if not user_id or not reactions_map:
            return False
        return reactions_map.get((user_id, comment_id), False)

    response = {
        "id": encode_int_id(comment.comment_id),
        "entity_id": encode_int_id(comment.entity_id),
        "entity_type": comment.entity_type,
        "user_id": encode_int_id(comment.user_id) if not comment.is_delete else None,
        "mentions": list(map(remove_delete, filter(filter_mentions, mentions))),
        "message": comment.text if not comment.is_delete else "[Removed]",
        "is_edited": comment.is_edited,
        "track_timestamp_s": comment.track_timestamp_s,
        "react_count": react_count,
        "is_current_user_reacted": is_reacted(current_user_id, comment.comment_id),
        "created_at": str(comment.created_at),
        "updated_at": str(comment.updated_at),
        "is_muted": is_muted if is_muted is not None else False,
    }

    # Check if we need to include replies (either explicitly provided or need to fetch them)
    if replies is not None:
        reply_count = len(replies)
        response.update(
            {
                "reply_count": reply_count,
                "replies": replies[:3],
                "is_tombstone": comment.is_delete and reply_count > 0,
                "is_artist_reacted": is_reacted(artist_id, comment.comment_id),
            }
        )
    # Even if no replies are provided, we need to set is_tombstone for deleted comments
    elif comment.is_delete:
        # Check if this comment has any replies in the database
        from src.models.comments.comment_thread import CommentThread

        reply_count = (
            session.query(CommentThread)
            .filter(CommentThread.parent_comment_id == comment.comment_id)
            .count()
        )

        response.update(
            {
                "reply_count": reply_count,
                "replies": [],
                "is_tombstone": reply_count > 0,
            }
        )

    return response


def get_muted_users(current_user_id):
    from src.queries.query_helpers import helpers, populate_user_metadata
    from src.utils.db_session import get_db_read_replica

    db = get_db_read_replica()
    users = []
    with db.scoped_session() as session:
        muted_users = (
            session.query(User)
            .join(MutedUser, MutedUser.muted_user_id == User.user_id)
            .filter(MutedUser.user_id == current_user_id, MutedUser.is_delete == False)
            .all()
        )
        muted_users_list = helpers.query_result_to_list(muted_users)
        user_ids = list(map(lambda user: user["user_id"], muted_users_list))
        users = populate_user_metadata(
            session, user_ids, muted_users_list, current_user_id
        )

    return users


def get_track_notification_setting(track_id, current_user_id):
    """
    Get notification settings for a track
    """
    if not current_user_id:
        return None

    db = get_db_read_replica()
    with db.scoped_session() as session:
        notification_setting = (
            session.query(CommentNotificationSetting)
            .filter(
                CommentNotificationSetting.entity_id == track_id,
                CommentNotificationSetting.entity_type == "Track",
                CommentNotificationSetting.user_id == current_user_id,
            )
            .first()
        )
        return notification_setting.is_muted if notification_setting else False


# New utility function to share common query logic
def build_comments_query(
    session,
    query_type,
    base_query,
    current_user_id=None,
    artist_id=None,
    entity_id=None,
    user_id=None,
    parent_comment_id=None,
    parent_comment_ids=None,  # New parameter for batch fetching replies
    pinned_comment_id=None,
    sort_method="newest",
):
    """
    Build a query for comments with common filtering and sorting logic

    Args:
        session: Database session
        query_type: Type of query ('track', 'user', 'replies', or 'batch_replies')
        base_query: Base query components from get_base_comments_query
        current_user_id: ID of the user making the request
        artist_id: ID of the track owner (for track comments and replies)
        entity_id: ID of the entity (track) to get comments for
        user_id: ID of the user whose comments to retrieve (for user comments)
        parent_comment_id: ID of the parent comment (for replies)
        parent_comment_ids: List of parent comment IDs (for batch_replies)
        pinned_comment_id: ID of the pinned comment (for track comments)
        sort_method: How to sort the comments (top, newest, timestamp)

    Returns:
        SQLAlchemy query object
    """
    from sqlalchemy import and_, asc, desc, func, or_
    from sqlalchemy.orm import aliased

    from src.models.comments.comment import Comment
    from src.models.comments.comment_notification_setting import (
        CommentNotificationSetting,
    )
    from src.models.comments.comment_report import (
        COMMENT_KARMA_THRESHOLD,
        CommentReport,
    )
    from src.models.comments.comment_thread import CommentThread
    from src.models.moderation.muted_user import MutedUser
    from src.models.tracks.track import Track
    from src.models.users.aggregate_user import AggregateUser

    mentioned_users = base_query["mentioned_users"]
    react_count_subquery = base_query["react_count_subquery"]

    CommentThreadAlias = aliased(CommentThread)

    # Determine sort order
    if sort_method == "top":
        sort_method_order_by = desc(
            func.coalesce(react_count_subquery.c.react_count, 0)
        )
    elif sort_method == "newest":
        sort_method_order_by = desc(Comment.created_at)
    elif sort_method == "timestamp":
        sort_method_order_by = asc(Comment.track_timestamp_s).nullslast()
    else:
        # Default to newest
        sort_method_order_by = desc(Comment.created_at)

    # Start building the query
    if query_type == "replies":
        # For replies to a single parent comment
        query = session.query(
            Comment,
            func.count(CommentReaction.comment_id).label("react_count"),
            func.array_agg(
                func.json_build_object(
                    "user_id",
                    mentioned_users.c.user_id,
                    "handle",
                    mentioned_users.c.handle,
                    "is_delete",
                    mentioned_users.c.is_delete,
                )
            ).label("mentions"),
        )
        query = query.join(
            CommentThread, Comment.comment_id == CommentThread.comment_id
        )
        query = query.outerjoin(
            CommentReaction, Comment.comment_id == CommentReaction.comment_id
        )
    elif query_type == "batch_replies":
        # For fetching replies to multiple parent comments at once
        query = session.query(
            Comment,
            func.count(CommentReaction.comment_id).label("react_count"),
            func.array_agg(
                func.json_build_object(
                    "user_id",
                    mentioned_users.c.user_id,
                    "handle",
                    mentioned_users.c.handle,
                    "is_delete",
                    mentioned_users.c.is_delete,
                )
            ).label("mentions"),
            CommentThread.parent_comment_id,  # Include parent_comment_id to map replies
        )
        query = query.join(
            CommentThread, Comment.comment_id == CommentThread.comment_id
        )
        query = query.outerjoin(
            CommentReaction,
            and_(
                Comment.comment_id == CommentReaction.comment_id,
                CommentReaction.is_delete == False,
            ),
        )
    else:
        # For track and user comments
        query = session.query(
            Comment,
            func.coalesce(react_count_subquery.c.react_count, 0).label("react_count"),
            CommentNotificationSetting.is_muted,
            func.array_agg(
                func.json_build_object(
                    "user_id",
                    mentioned_users.c.user_id,
                    "handle",
                    mentioned_users.c.handle,
                    "is_delete",
                    mentioned_users.c.is_delete,
                )
            ).label("mentions"),
        )
        query = query.outerjoin(
            CommentThreadAlias, Comment.comment_id == CommentThreadAlias.comment_id
        )

    # Common joins for all query types
    query = query.outerjoin(
        mentioned_users, Comment.comment_id == mentioned_users.c.comment_id
    )
    query = query.outerjoin(
        CommentReport, Comment.comment_id == CommentReport.comment_id
    )
    query = query.outerjoin(
        AggregateUser, AggregateUser.user_id == CommentReport.user_id
    )

    # Add query-specific joins
    if query_type not in ["replies", "batch_replies"]:
        query = query.outerjoin(
            react_count_subquery,
            Comment.comment_id == react_count_subquery.c.comment_id,
        )
        query = query.outerjoin(
            CommentNotificationSetting,
            (Comment.comment_id == CommentNotificationSetting.entity_id)
            & (CommentNotificationSetting.entity_type == "Comment"),
        )

    # Create a subquery to find muted users
    # This approach ensures we correctly filter out comments from users muted by either
    # the current user or the track owner
    muted_users_subquery = None
    if current_user_id is not None or artist_id is not None:
        muted_users_query = session.query(MutedUser.muted_user_id).filter(
            MutedUser.is_delete == False
        )

        mute_conditions = []
        if current_user_id is not None:
            mute_conditions.append(MutedUser.user_id == current_user_id)
        if artist_id is not None and query_type != "user":
            mute_conditions.append(MutedUser.user_id == artist_id)

        if mute_conditions:
            muted_users_query = muted_users_query.filter(or_(*mute_conditions))
            muted_users_subquery = muted_users_query.subquery()

    # Add query-specific filters
    if query_type == "track":
        # For track comments
        query = query.filter(
            Comment.entity_id == entity_id,
            Comment.entity_type == "Track",
            CommentThreadAlias.parent_comment_id
            == None,  # Check if parent_comment_id is null
        )

        # Add ReplyCountAlias for track comments to handle tombstone comments
        ReplyCountAlias = aliased(CommentThread)
        query = query.outerjoin(
            ReplyCountAlias, Comment.comment_id == ReplyCountAlias.parent_comment_id
        )
        query = query.group_by(
            Comment.comment_id,
            react_count_subquery.c.react_count,
            CommentNotificationSetting.is_muted,
        )

        # For track comments, we want to include tombstone comments (deleted comments with replies)
        # This is important for maintaining thread context
        query = query.having(
            (func.count(ReplyCountAlias.comment_id) > 0) | (Comment.is_delete == False),
        )
    elif query_type == "coin":
        query = query.filter(
            Comment.entity_id == entity_id,
            Comment.entity_type == FAN_CLUB_ENTITY_TYPE,
            CommentThreadAlias.parent_comment_id == None,
        )

        ReplyCountAlias = aliased(CommentThread)
        query = query.outerjoin(
            ReplyCountAlias, Comment.comment_id == ReplyCountAlias.parent_comment_id
        )
        query = query.group_by(
            Comment.comment_id,
            react_count_subquery.c.react_count,
            CommentNotificationSetting.is_muted,
        )
        query = query.having(
            (func.count(ReplyCountAlias.comment_id) > 0) | (Comment.is_delete == False),
        )
    elif query_type == "user":
        # For user comments
        query = query.filter(
            Comment.user_id == user_id,
            Comment.is_delete == False,  # Don't show deleted comments in user profile
            Comment.is_visible == True,
            Comment.entity_type == "Track",
        )

        # Join with Track and filter out unlisted tracks
        query = query.join(
            Track,
            and_(
                Comment.entity_id == Track.track_id,
                Track.is_unlisted == False,
                Track.is_delete == False,  # Filter out comments on deleted tracks
            ),
        )

        query = query.group_by(
            Comment.comment_id,
            react_count_subquery.c.react_count,
            CommentNotificationSetting.is_muted,
        )
    elif query_type == "replies":
        # For replies to a single parent comment
        query = query.filter(
            CommentThread.parent_comment_id == parent_comment_id,
            Comment.is_delete == False,  # Don't show deleted replies
        )
        query = query.group_by(Comment.comment_id)
    elif query_type == "batch_replies":
        # For fetching replies to multiple parent comments at once
        query = query.filter(
            CommentThread.parent_comment_id.in_(parent_comment_ids),
            Comment.is_delete == False,  # Don't show deleted replies
        )
        query = query.group_by(Comment.comment_id, CommentThread.parent_comment_id)

    # Common filters for all query types
    query = query.filter(
        or_(
            CommentReport.comment_id == None,
            and_(
                CommentReport.user_id != current_user_id,
                CommentReport.is_delete == True,
            ),
        )
    )

    # Filter out comments from muted users, but always show comments to their owners
    if muted_users_subquery is not None:
        if current_user_id is not None:
            query = query.filter(
                or_(
                    Comment.user_id
                    == current_user_id,  # Always show user's own comments
                    ~Comment.user_id.in_(
                        muted_users_subquery
                    ),  # Filter out muted users
                )
            )
        else:
            query = query.filter(~Comment.user_id.in_(muted_users_subquery))

    # Add artist_id filter for track comments and replies
    if artist_id is not None and query_type != "user":
        query = query.filter(
            or_(
                CommentReport.user_id == None,
                CommentReport.user_id != artist_id,
            )
        )

    # Add karma threshold for track and user comments
    if query_type not in ["replies", "batch_replies"]:
        query = query.having(
            func.coalesce(func.sum(AggregateUser.follower_count), 0)
            < COMMENT_KARMA_THRESHOLD,
        )

    # Add sorting
    if query_type == "track" and pinned_comment_id is not None:
        query = query.order_by(
            # pinned comments at the top, tombstone comments at the bottom, then all others inbetween
            desc(Comment.comment_id == pinned_comment_id),
            asc(Comment.is_delete),  # required for tombstone
            sort_method_order_by,
            desc(func.sum(AggregateUser.follower_count)),  # karma
            desc(Comment.created_at),
        )
    elif query_type == "track" and sort_method == "timestamp":
        # For timestamp sorting, we need special handling to ensure tombstone comments appear at the end
        query = query.order_by(
            asc(Comment.is_delete),  # Non-deleted comments first
            sort_method_order_by,  # Then sort by timestamp
            desc(func.sum(AggregateUser.follower_count)),  # karma
            desc(Comment.created_at),
        )
    elif query_type in ["replies", "batch_replies"]:
        query = query.order_by(asc(Comment.created_at))
    else:
        query = query.order_by(
            sort_method_order_by,
            desc(func.sum(AggregateUser.follower_count)),  # karma
            desc(Comment.created_at),
        )

    return query


def format_comments(
    session, comments, current_user_id, include_replies=False, artist_id=None
):
    """
    Format a list of comments, optionally including their replies.

    Args:
        session: Database session
        comments: List of comment query results (tuples from the database)
        current_user_id: ID of the user making the request
        include_replies: Whether to include replies in the response
        artist_id: ID of the track owner (for track comments and replies)

    Returns:
        List of formatted comments
    """
    if not comments:
        return []

    # Extract all parent comment IDs for which we need to fetch replies
    parent_comment_ids = [comment_data[0].comment_id for comment_data in comments]

    # Get replies first so we can collect all comment IDs
    replies_results = None
    if include_replies and parent_comment_ids:
        # Get base query components
        base_query = get_base_comments_query(session, current_user_id)

        # Build the query using batch_replies query type
        replies_query = build_comments_query(
            session=session,
            query_type="batch_replies",
            base_query=base_query,
            current_user_id=current_user_id,
            artist_id=artist_id,
            parent_comment_ids=parent_comment_ids,
        )
        replies_results = replies_query.all()

    # Collect all comment IDs and user IDs we need to check reactions for
    comment_ids = []
    user_ids = []

    # Add main comments
    for comment_data in comments:
        comment = comment_data[0]  # First element is always the comment
        comment_ids.append(comment.comment_id)

    # Add reply comment IDs if we have them
    if replies_results:
        for reply, _, _, _ in replies_results:
            comment_ids.append(reply.comment_id)

    # Add current user and artist if present
    if current_user_id:
        user_ids.append(current_user_id)
    if artist_id:
        user_ids.append(artist_id)

    # Batch fetch all reactions
    reactions_map = get_reactions_batch(session, comment_ids, user_ids)

    # If we don't need to include replies, just format the comments directly
    if not include_replies:
        formatted_comments = []
        for comment_data in comments:
            # Handle different tuple structures from different queries
            if len(comment_data) == 3:  # replies query
                comment, react_count, mentions = comment_data
                is_muted = None
            else:  # track or user comments query
                comment, react_count, is_muted, mentions = comment_data

            # Format the comment without replies
            formatted_comment = _format_comment_response(
                comment,
                react_count,
                is_muted,
                mentions,
                current_user_id,
                session,
                artist_id=artist_id,
                replies=None,
                reactions_map=reactions_map,
            )
            formatted_comments.append(formatted_comment)
        return formatted_comments

    # Create a mapping of comment_id to its position in the original list
    # This is important to maintain the original order
    comment_position_map = {
        comment_data[0].comment_id: idx for idx, comment_data in enumerate(comments)
    }

    # Initialize the formatted comments list with None placeholders
    formatted_comments = [None] * len(comments)

    # Use our helper function to fetch all replies in a single query
    replies_map = get_comment_replies(
        session=session,
        parent_comment_ids=parent_comment_ids,
        current_user_id=current_user_id,
        artist_id=artist_id,
        reactions_map=reactions_map,
    )

    # Now format the main comments with their replies
    for comment_data in comments:
        # Handle different tuple structures from different queries
        if len(comment_data) == 3:  # replies query
            comment, react_count, mentions = comment_data
            is_muted = None
        else:  # track or user comments query
            comment, react_count, is_muted, mentions = comment_data

        # Get replies for this comment
        comment_replies = replies_map.get(comment.comment_id, [])

        # Format the comment with its replies
        formatted_comment = _format_comment_response(
            comment,
            react_count,
            is_muted,
            mentions,
            current_user_id,
            session,
            artist_id=artist_id,
            replies=comment_replies,
            reactions_map=reactions_map,
        )

        # Add to the formatted comments list at the correct position
        position = comment_position_map[comment.comment_id]
        formatted_comments[position] = formatted_comment

    return formatted_comments


def extract_ids_from_comments(formatted_comments):
    """
    Extract user and track IDs from a list of formatted comments.

    Args:
        formatted_comments: List of formatted comments

    Returns:
        Tuple of (user_ids, track_ids) where both are sets of IDs
    """
    from src.utils.helpers import decode_string_id

    user_ids = set()
    track_ids = set()

    for comment in formatted_comments:
        # Add user ID from the main comment
        if comment.get("user_id"):
            user_ids.add(decode_string_id(comment["user_id"]))

        # Add track ID from the main comment
        if comment.get("entity_type") == "Track" and comment.get("entity_id"):
            track_ids.add(decode_string_id(comment["entity_id"]))

        if comment.get("entity_type") == FAN_CLUB_ENTITY_TYPE and comment.get(
            "entity_id"
        ):
            user_ids.add(decode_string_id(comment["entity_id"]))

        # If we have replies, collect their IDs too
        if comment.get("replies"):
            for reply in comment["replies"]:
                # Extract IDs from reply
                reply_user_id = (
                    decode_string_id(reply["user_id"]) if reply.get("user_id") else None
                )
                reply_entity_id = (
                    decode_string_id(reply["entity_id"])
                    if reply.get("entity_id")
                    else None
                )

                # Add to our collections
                if reply_user_id:
                    user_ids.add(reply_user_id)

                if reply.get("entity_type") == "Track" and reply_entity_id:
                    track_ids.add(reply_entity_id)

                if reply.get("entity_type") == FAN_CLUB_ENTITY_TYPE and reply.get(
                    "entity_id"
                ):
                    user_ids.add(decode_string_id(reply["entity_id"]))

    return list(user_ids), list(track_ids)


def fetch_related_entities(session, formatted_comments, current_user_id):
    """
    Extract IDs from formatted comments and fetch related users and tracks.

    Args:
        session: Database session
        formatted_comments: List of formatted comments
        current_user_id: ID of the user making the request

    Returns:
        Tuple of (related_users, related_tracks)
    """
    # Extract user and track IDs from the formatted comments
    user_ids, track_ids = extract_ids_from_comments(formatted_comments)

    # Fetch the related entities
    users = get_users(session, user_ids, current_user_id)
    tracks = get_tracks(session, track_ids, current_user_id)

    return users, tracks


def get_comment_replies(
    session,
    parent_comment_ids,
    current_user_id,
    artist_id=None,
    offset=None,
    limit=None,
    reactions_map=None,
):
    """
    Fetch replies for one or more parent comments.

    Args:
        session: Database session
        parent_comment_ids: Single parent comment ID or list of parent comment IDs
        current_user_id: ID of the user making the request
        artist_id: ID of the track owner (optional)
        offset: Pagination offset (optional)
        limit: Pagination limit (optional)
        reactions_map: Pre-fetched reactions map (optional)

    Returns:
        If parent_comment_ids is a list, returns a dict mapping parent_comment_id to list of formatted replies
        If parent_comment_ids is a single ID, returns a list of formatted replies
    """
    from src.utils.helpers import encode_int_id

    # Handle single parent_comment_id case
    single_parent = not isinstance(parent_comment_ids, list)
    if single_parent:
        parent_comment_ids = [parent_comment_ids]

    # Get base query components
    base_query = get_base_comments_query(session, current_user_id)

    # Build the query using batch_replies query type
    replies_query = build_comments_query(
        session=session,
        query_type="batch_replies",
        base_query=base_query,
        current_user_id=current_user_id,
        artist_id=artist_id,
        parent_comment_ids=parent_comment_ids,
    )

    # Apply pagination if provided
    if offset is not None:
        replies_query = replies_query.offset(offset)
    if limit is not None:
        replies_query = replies_query.limit(limit)

    # Execute the query
    replies_results = replies_query.all()

    # If we don't have a reactions map and we have replies, create one
    if not reactions_map and replies_results:
        # Collect reply IDs
        reply_ids = [reply.comment_id for reply, _, _, _ in replies_results]

        # Collect user IDs to check reactions for
        user_ids = []
        if current_user_id:
            user_ids.append(current_user_id)
        if artist_id:
            user_ids.append(artist_id)

        # Batch fetch reactions for replies
        reactions_map = get_reactions_batch(session, reply_ids, user_ids)

    # Process the results and organize replies by parent_comment_id
    replies_map = {}
    for reply_data in replies_results:
        reply, react_count, mentions, parent_id = reply_data

        # Format the reply
        formatted_reply = {
            "id": encode_int_id(reply.comment_id),
            "entity_id": encode_int_id(reply.entity_id),
            "entity_type": reply.entity_type,
            "user_id": encode_int_id(reply.user_id) if not reply.is_delete else None,
            "mentions": list(
                map(
                    lambda m: {k: v for k, v in m.items() if k != "is_delete"},
                    [
                        m
                        for m in mentions
                        if m["user_id"] is not None and m["is_delete"] is not True
                    ],
                )
            ),
            "message": reply.text if not reply.is_delete else "[Removed]",
            "is_edited": reply.is_edited,
            "track_timestamp_s": reply.track_timestamp_s,
            "react_count": react_count,
            "is_current_user_reacted": (
                reactions_map.get((current_user_id, reply.comment_id), False)
                if reactions_map
                else get_is_reacted(session, current_user_id, reply.comment_id)
            ),
            "created_at": str(reply.created_at),
            "updated_at": str(reply.updated_at),
            "is_muted": False,  # Replies don't have mute status
            "is_artist_reacted": (
                reactions_map.get((artist_id, reply.comment_id), False)
                if reactions_map
                else (
                    get_is_reacted(session, artist_id, reply.comment_id)
                    if artist_id
                    else False
                )
            ),
        }

        # Add to the replies map
        if parent_id not in replies_map:
            replies_map[parent_id] = []
        replies_map[parent_id].append(formatted_reply)

    # Return the appropriate structure based on input
    if single_parent:
        return replies_map.get(parent_comment_ids[0], [])
    else:
        return replies_map
