from sqlalchemy import Column, DateTime, Integer, String, Text, text

from src.models.base import Base
from src.models.model_utils import RepresentableMixin


class OauthRedirectUri(Base, RepresentableMixin):
    __tablename__ = "oauth_redirect_uris"

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(String(255), nullable=False, index=True)
    redirect_uri = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=text("NOW()"))
