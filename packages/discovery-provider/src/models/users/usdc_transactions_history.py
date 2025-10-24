import enum

from sqlalchemy import Column, DateTime, Enum, Integer, Numeric, String, text

from src.models.base import Base
from src.models.model_utils import RepresentableMixin


class USDCTransactionType(str, enum.Enum):
    purchase_content = "PURCHASE_CONTENT"
    transfer = "TRANSFER"
    internal_transfer = "INTERNAL_TRANSFER"
    prepare_withdrawal = "PREPARE_WITHDRAWAL"
    recover_withdrawal = "RECOVER_WITHDRAWAL"
    withdrawal = "WITHDRAWAL"
    purchase_stripe = "PURCHASE_STRIPE"


class USDCTransactionMethod(str, enum.Enum):
    send = "SEND"
    receive = "RECEIVE"


class USDCTransactionsHistory(Base, RepresentableMixin):
    __tablename__ = "usdc_transactions_history"

    user_bank = Column(String, primary_key=True, nullable=False)
    slot = Column(Integer, nullable=False, index=True)
    signature = Column(String, primary_key=True, nullable=False)
    transaction_type = Column(Enum(USDCTransactionType), nullable=False, index=True)
    method = Column(Enum(USDCTransactionMethod), nullable=False, index=True)
    created_at = Column(
        DateTime, nullable=False, index=True, server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at = Column(
        DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    transaction_created_at = Column(DateTime, nullable=False)
    change = Column(Numeric, nullable=False)
    balance = Column(Numeric, nullable=False)
    tx_metadata = Column(String, nullable=True)
