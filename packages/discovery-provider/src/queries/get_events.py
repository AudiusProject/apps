import logging
from typing import List, Optional, TypedDict

from sqlalchemy import desc, func, or_

from src.models.comments.comment_report import COMMENT_KARMA_THRESHOLD
from src.models.events.event import Event, EventEntityType, EventType
from src.models.moderation.muted_user import MutedUser
from src.models.users.aggregate_user import AggregateUser
from src.queries.query_helpers import add_query_pagination, get_pagination_vars
from src.utils import helpers
from src.utils.db_session import get_db_read_replica
from src.utils.helpers import encode_int_id

logger = logging.getLogger(__name__)


class GetEventArgs(TypedDict, total=False):
    entity_id: int
    entity_type: Optional[EventEntityType]
    event_type: Optional[EventType]
    limit: int
    offset: int
    current_user_id: Optional[int]
    filter_deleted: bool


def format_events(events) -> List[Event]:
    """Format events for the API response."""
    formatted_events = []
    for event in events:
        formatted_events.append(
            {
                "event_id": encode_int_id(event.get("event_id")),
                "entity_type": (event.get("entity_type").value),
                "user_id": encode_int_id(event.get("user_id")),
                "entity_id": (encode_int_id(event.get("entity_id"))),
                "event_type": event.get("event_type").value,
                "end_date": str(event.get("end_date")),
                "is_deleted": event.get("is_deleted"),
                "created_at": str(event.get("created_at")),
                "updated_at": str(event.get("updated_at")),
                "event_data": event.get("event_data"),
            }
        )

    return formatted_events  # type: ignore


def get_events_by_ids(args) -> List[Event]:
    """Get a list of events by their IDs.

    Args:
        args: Dictionary containing:
            - id (List[int]): List of event IDs to fetch
            - event_type (Optional[EventType]): Type of event to filter by

    Returns:
        List[Event]: List of events corresponding to the provided IDs.
    """

    db = get_db_read_replica()
    ids = args.get("id")
    with db.scoped_session() as session:
        query = session.query(Event)
        if ids:
            query = query.filter(Event.event_id.in_(ids))
        if args.get("event_type") is not None:
            query = query.filter(Event.event_type == args.get("event_type"))

        events = helpers.query_result_to_list(query.all())
        return format_events(events)


def _get_events(session, args):
    """Internal method to query events with the given arguments"""
    # Create initial query
    base_query = session.query(Event)

    # Filter by entity_ids if provided
    if args.get("entity_ids") is not None:
        base_query = base_query.filter(Event.entity_id.in_(args.get("entity_ids")))

    # Filter by entity_type if provided
    if args.get("entity_type") is not None:
        base_query = base_query.filter(Event.entity_type == args.get("entity_type"))

    # Filter by event_type if provided
    if args.get("event_type") is not None:
        base_query = base_query.filter(Event.event_type == args.get("event_type"))

    # Allow filtering of deletes
    if args.get("filter_deleted", True):
        base_query = base_query.filter(Event.is_deleted == False)

    # Hide events whose host is shadow-banned. The discovery-provider
    # has two parallel shadow-ban signals; we apply both so the filter
    # catches the full population:
    #
    # 1. `aggregate_user.score < 0` — composite account-quality signal
    #    (impersonators, low engagement, chat-blocks). Same check used
    #    by the SQL feed handlers handle_save, handle_follow,
    #    handle_repost. OUTER JOIN with a NULL-pass so brand-new users
    #    without an aggregate_user row aren't excluded.
    # 2. `muted_by_karma` — host has been comment-muted by users whose
    #    combined follower counts cross COMMENT_KARMA_THRESHOLD. Same
    #    subquery shape used in `get_track_comment_count.py` for
    #    per-user comment hiding.
    muted_by_karma = (
        session.query(MutedUser.muted_user_id)
        .join(AggregateUser, MutedUser.user_id == AggregateUser.user_id)
        .filter(MutedUser.is_delete == False)
        .group_by(MutedUser.muted_user_id)
        .having(func.sum(AggregateUser.follower_count) >= COMMENT_KARMA_THRESHOLD)
        .subquery()
    )
    base_query = base_query.outerjoin(
        AggregateUser, AggregateUser.user_id == Event.user_id
    ).filter(
        or_(AggregateUser.score >= 0, AggregateUser.score.is_(None)),
        ~Event.user_id.in_(muted_by_karma),
    )

    # Order by created_at desc by default
    base_query = base_query.order_by(desc(Event.created_at))

    # Add pagination
    query_results = add_query_pagination(base_query, args["limit"], args["offset"])

    # Convert to list of dicts
    events = helpers.query_result_to_list(query_results.all())
    return events


def get_events(args: GetEventArgs):
    """
    Gets events based on the provided arguments.

    Args:
        args (GetEventArgs): Arguments for filtering and pagination
            - entity_id (int): ID of the entity to get events for
            - entity_type (EventEntityType, optional): Type of entity
            - current_user_id (int, optional): ID of the current user
            - filter_deleted (bool, optional): Whether to filter deleted events

    Returns:
        List of events matching the criteria
    """
    db = get_db_read_replica()
    with db.scoped_session() as session:
        # Get pagination params if not provided
        if "limit" not in args or "offset" not in args:
            (limit, offset) = get_pagination_vars()
            args["limit"] = limit
            args["offset"] = offset

        events = _get_events(session, args)

        return format_events(events)
