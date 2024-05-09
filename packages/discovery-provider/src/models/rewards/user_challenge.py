from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, text
from sqlalchemy.orm import relationship

from src.models.base import Base
from src.models.model_utils import RepresentableMixin


class UserChallenge(Base, RepresentableMixin):
    """Represents user progress through a particular challenge."""

    __tablename__ = "user_challenges"

    challenge_id = Column(  # type: ignore
        ForeignKey("challenges.id"), primary_key=True, nullable=False, index=True
    )
    user_id = Column(Integer, nullable=False)
    specifier = Column(String, primary_key=True, nullable=False)
    is_complete = Column(Boolean, nullable=False)
    current_step_count = Column(Integer)
    completed_blocknumber = Column(
        DateTime,
        server_default=text("CURRENT_TIMESTAMP"),
    )
    completed_at = Column(DateTime)
    amount = Column(Integer, nullable=False)
    created_at = Column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    challenge = relationship("Challenge")  # type: ignore
