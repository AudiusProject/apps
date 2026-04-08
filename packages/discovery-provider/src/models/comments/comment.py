from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Text

from src.models.base import Base
from src.models.model_utils import RepresentableMixin

FAN_CLUB_ENTITY_TYPE = "FanClub"


class Comment(Base, RepresentableMixin):
    __tablename__ = "comments"

    comment_id = Column(Integer, primary_key=True)
    text = Column(Text, nullable=False)
    user_id = Column(Integer, nullable=False)
    entity_id = Column(Integer, nullable=False)
    entity_type = Column(Text, nullable=False)
    track_timestamp_s = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    is_delete = Column(Boolean, default=False)
    is_visible = Column(Boolean, default=True)
    is_edited = Column(Boolean, default=False)
    is_members_only = Column(Boolean, default=False, nullable=False)
    video_url = Column(Text, nullable=True)
    txhash = Column(Text, nullable=False)
    blockhash = Column(Text, nullable=False)
    blocknumber = Column(Integer, ForeignKey("blocks.number"), nullable=False)

    def get_attributes_dict(self):
        return {col.name: getattr(self, col.name) for col in self.__table__.columns}
