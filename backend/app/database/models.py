from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import DeclarativeBase, relationship
from datetime import datetime, timezone


class Base(DeclarativeBase):
    pass


class CrawlModel(Base):
    __tablename__ = "crawls"

    id = Column(String, primary_key=True)
    start_url = Column(String, nullable=False)
    domain = Column(String, nullable=False)
    status = Column(String, default="PENDING")
    max_pages = Column(Integer, default=1000)
    max_depth = Column(Integer, default=5)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    pages = relationship("PageModel", back_populates="crawl", cascade="all, delete-orphan")
    errors = relationship("ErrorModel", back_populates="crawl", cascade="all, delete-orphan")


class PageModel(Base):
    __tablename__ = "pages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    crawl_id = Column(String, ForeignKey("crawls.id"), nullable=False)
    url = Column(String, nullable=False)
    status_code = Column(Integer, nullable=True)
    title = Column(String, nullable=True)
    h1 = Column(String, nullable=True)
    response_time_ms = Column(Float, nullable=True)
    response_size = Column(Integer, nullable=True)
    depth = Column(Integer, default=0)
    is_internal = Column(Boolean, default=True)
    crawled_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    crawl = relationship("CrawlModel", back_populates="pages")
    outgoing_links = relationship("LinkModel", back_populates="source_page", cascade="all, delete-orphan")


class LinkModel(Base):
    __tablename__ = "links"

    id = Column(Integer, primary_key=True, autoincrement=True)
    crawl_id = Column(String, ForeignKey("crawls.id"), nullable=False)
    source_page_id = Column(Integer, ForeignKey("pages.id"), nullable=False)
    target_url = Column(String, nullable=False)
    is_internal = Column(Boolean, default=True)

    source_page = relationship("PageModel", back_populates="outgoing_links")


class ErrorModel(Base):
    __tablename__ = "errors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    crawl_id = Column(String, ForeignKey("crawls.id"), nullable=False)
    url = Column(String, nullable=False)
    error_type = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)

    crawl = relationship("CrawlModel", back_populates="errors")
