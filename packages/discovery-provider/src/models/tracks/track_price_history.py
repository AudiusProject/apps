from typing import Self

from sqlalchemy import BigInteger, Column, DateTime, Enum, Integer, text
from sqlalchemy.dialects.postgresql import JSONB

from src.models.base import Base
from src.models.model_utils import RepresentableMixin
from src.models.users.usdc_purchase import PurchaseAccessType


class TrackPriceHistory(Base, RepresentableMixin):
    __tablename__ = "track_price_history"

    track_id = Column(Integer, nullable=False, primary_key=True)
    splits = Column(JSONB(), nullable=False)
    total_price_cents = Column(BigInteger, nullable=False)
    access = Column(Enum(PurchaseAccessType), nullable=False)
    blocknumber = Column(BigInteger, nullable=False)
    block_timestamp = Column(DateTime, nullable=False, primary_key=True)
    created_at = Column(
        DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )

    def equals(self, rec: Self):
        return (
            self.total_price_cents == rec.total_price_cents
            and self.splits == rec.splits
            and self.access == rec.access
        )
