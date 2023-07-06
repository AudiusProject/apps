import enum

from sqlalchemy import Column, DateTime, Enum, Integer, Numeric, String, text
from src.models.base import Base
from src.models.model_utils import RepresentableMixin


class UsdcPurchaseContentType(str, enum.Enum):
    track = "track"
    playlist = "playlist"
    album = "album"


class UsdcPurchase(Base, RepresentableMixin):
    __tablename__ = "usdc_purchases"

    slot = Column(Integer, nullable=False, index=True)
    signature = Column(String, primary_key=True, nullable=False)
    buyer_user_id = Column(String, nullable=False, index=True)
    seller_user_id = Column(String, nullable=False, index=True)
    amount = Column(Numeric, nullable=False)
    content_type = Column(Enum(UsdcPurchaseContentType), nullable=False)
    content_id = Column(Integer, nullable=False)

    created_at = Column(
        DateTime, nullable=False, index=True, server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at = Column(
        DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
