from sqlalchemy import Boolean, Column, DateTime, Integer, String, text

from src.models.base import Base
from src.models.model_utils import RepresentableMixin


SUBSCRIPTION_USER_ENTITY_TYPE = "User"
SUBSCRIPTION_EVENT_ENTITY_TYPE = "Event"


class Subscription(Base, RepresentableMixin):
    __tablename__ = "subscriptions"

    blockhash = Column(String)
    blocknumber = Column(Integer, index=True)
    subscriber_id = Column(Integer, primary_key=True, nullable=False)
    user_id = Column(Integer, primary_key=True, nullable=False, index=True)
    is_current = Column(Boolean, primary_key=True, nullable=False)
    is_delete = Column(Boolean, nullable=False)
    created_at = Column(
        DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    txhash = Column(
        String,
        primary_key=True,
        nullable=False,
        server_default=text("''::character varying"),
    )
    # entity_type discriminates what the subscription targets. Existing rows
    # all use 'User' (keyed by user_id). New rows may use 'Event' — in which
    # case entity_id is populated with the event_id and user_id mirrors that
    # value so the pre-existing (subscriber_id, user_id) unique key stays
    # collision-free across subscription kinds.
    entity_type = Column(String, nullable=False, server_default=text("'User'"))
    entity_id = Column(Integer, nullable=True)
