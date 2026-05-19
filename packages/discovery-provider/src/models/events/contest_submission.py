from sqlalchemy import Column, DateTime, Integer, text

from src.models.base import Base
from src.models.model_utils import RepresentableMixin


class ContestSubmission(Base, RepresentableMixin):
    """Tracks submitted to an open_contest event.

    Table lives in api-land (see api repo migration 0203); discovery's
    entity manager writes a row here when it processes a SubmitToContest
    ManageEntity action.
    """

    __tablename__ = "contest_submissions"

    contest_id = Column(Integer, primary_key=True)
    track_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    created_at = Column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    def get_attributes_dict(self):
        return {col.name: getattr(self, col.name) for col in self.__table__.columns}
