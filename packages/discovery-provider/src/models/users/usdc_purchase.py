import enum

from sqlalchemy import BigInteger, Column, DateTime, Enum, Integer, String, text

from src.models.base import Base
from src.models.model_utils import RepresentableMixin


class PurchaseType(str, enum.Enum):
    track = "track"
    playlist = "playlist"
    album = "album"


class PurchaseAccessType(str, enum.Enum):
    stream = "stream"
    download = "download"


class PurchaseVendor(str, enum.Enum):
    user_bank = "user_bank"
    coinflow = "coinflow"


class USDCPurchase(Base, RepresentableMixin):
    __tablename__ = "usdc_purchases"

    slot = Column(Integer, primary_key=True, nullable=False, index=True)
    signature = Column(String, primary_key=True, nullable=False)
    seller_user_id = Column(Integer, nullable=False, index=True)
    buyer_user_id = Column(Integer, nullable=False, index=True)
    amount = Column(BigInteger, nullable=False)
    extra_amount = Column(BigInteger, nullable=False, server_default=text("0"))
    content_type = Column(Enum(PurchaseType), nullable=False, index=True)
    content_id = Column(Integer, nullable=False)
    access = Column(Enum(PurchaseAccessType), nullable=False)
    city = Column(String, nullable=True)
    region = Column(String, nullable=True)
    country = Column(String, nullable=True)
    vendor = Column(Enum(PurchaseVendor), nullable=True)

    created_at = Column(
        DateTime, nullable=False, index=True, server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at = Column(
        DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
