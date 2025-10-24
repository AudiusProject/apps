import enum

from sqlalchemy import Boolean, Column, Enum, Index, Integer, String

from src.models.base import Base
from src.models.model_utils import RepresentableMixin


class WalletChain(str, enum.Enum):
    eth = "eth"
    sol = "sol"


class AssociatedWallet(Base, RepresentableMixin):
    __tablename__ = "associated_wallets"
    __table_args__ = (
        Index("ix_associated_wallets_wallet", "wallet", "is_current"),
        Index("ix_associated_wallets_user_id", "user_id", "is_current"),
    )

    id = Column(
        Integer,
        primary_key=True,
    )
    user_id = Column(Integer, nullable=False)
    wallet = Column(String, nullable=False)
    blockhash = Column(String, nullable=True)
    blocknumber = Column(Integer, nullable=True)
    is_current = Column(Boolean, nullable=False)
    is_delete = Column(Boolean, nullable=False)
    chain = Column(Enum(WalletChain), nullable=False)
