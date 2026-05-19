import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB

from src.models.base import Base
from src.models.model_utils import RepresentableMixin


class EventType(str, enum.Enum):
    """Enum for event types"""

    remix_contest = "remix_contest"
    live_event = "live_event"
    new_release = "new_release"
    open_contest = "open_contest"


class EventEntityType(str, enum.Enum):
    """Enum for event entity types"""

    track = "track"
    collection = "collection"
    user = "user"


class Event(Base, RepresentableMixin):
    """Model class for events table.

    Table storing events in the Audius ecosystem.
    """

    __tablename__ = "events"

    event_id = Column(Integer, primary_key=True)
    event_type = Column(Enum(EventType), nullable=False, index=True)
    user_id = Column(Integer, nullable=False)
    entity_type = Column(Enum(EventEntityType), nullable=True, index=True)
    entity_id = Column(Integer, nullable=True, index=True)
    event_data = Column(JSONB(), nullable=False)
    is_deleted = Column(Boolean, default=False)
    end_date = Column(DateTime, nullable=True, index=True)
    created_at = Column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
        index=True,
    )
    updated_at = Column(
        DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    txhash = Column(String, nullable=False, server_default=text("''"))
    blockhash = Column(String, nullable=False)
    blocknumber = Column(Integer, ForeignKey("blocks.number"), nullable=False)

    def get_attributes_dict(self):
        return {col.name: getattr(self, col.name) for col in self.__table__.columns}
