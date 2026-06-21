# models.py
import uuid
from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, Date, BigInteger, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import ARRAY, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('Admin', 'Manager', 'Staff')", name="check_user_role"),
    )
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=True, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    login_logs = relationship("LoginLog", back_populates="user")
    inspection_logs = relationship("InspectionLog", back_populates="user")

class LoginLog(Base):
    __tablename__ = "login_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    login_time = Column(TIMESTAMP(timezone=True), server_default=func.now())
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(Text)

    user = relationship("User", back_populates="login_logs")

class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String(20), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    elders = relationship("Elder", back_populates="room")
    assets = relationship("Asset", back_populates="room", cascade="all, delete-orphan")

class Elder(Base):
    __tablename__ = "elders"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="SET NULL"))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    room = relationship("Room", back_populates="elders")
    assets = relationship("Asset", back_populates="elder")

class Asset(Base):
    __tablename__ = "assets"
    __table_args__ = (
        CheckConstraint("status IN ('Active', 'Archived')", name="check_asset_status"),
    )
    id = Column(Integer, primary_key=True, index=True)
    asset_name = Column(String(150), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"))
    elder_id = Column(Integer, ForeignKey("elders.id", ondelete="SET NULL"))
    status = Column(String(20), default='Active')
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    room = relationship("Room", back_populates="assets")
    elder = relationship("Elder", back_populates="assets")
    inspection_logs = relationship("InspectionLog", back_populates="asset", cascade="all, delete-orphan")

class Shift(Base):
    __tablename__ = "shifts"
    __table_args__ = (
        UniqueConstraint("shift_date", "shift_type", name="uq_shift_date_type"),
        CheckConstraint("shift_type IN ('Sang', 'Toi')", name="check_shift_type"),
        CheckConstraint("status IN ('Open', 'Submitted')", name="check_shift_status"),
    )
    id = Column(Integer, primary_key=True, index=True)
    shift_date = Column(Date, nullable=False, default=func.current_date())
    shift_type = Column(String(10), nullable=False)
    status = Column(String(20), default='Open')
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    inspection_logs = relationship("InspectionLog", back_populates="shift", cascade="all, delete-orphan")

class Nonce(Base):
    __tablename__ = "nonces"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(Text, nullable=False)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    used = Column(Boolean, default=False, nullable=False)

class InspectionLog(Base):
    __tablename__ = "inspection_logs"
    __table_args__ = (
        CheckConstraint("status IN ('Xanh', 'Vang', 'Dang_Xu_Ly', 'Loi_Upload')", name="check_inspection_status"),
    )
    id = Column(Integer, primary_key=True, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"))
    status = Column(String(20), nullable=False)
    image_url = Column(Text)
    note = Column(Text)
    version = Column(Integer, default=1)
    is_latest = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    nonce_id = Column(String(36), ForeignKey("nonces.id", ondelete="SET NULL"), nullable=True)

    shift = relationship("Shift", back_populates="inspection_logs")
    user = relationship("User", back_populates="inspection_logs")
    asset = relationship("Asset", back_populates="inspection_logs")

class ShiftSummary(Base):
    __tablename__ = "shift_summaries"
    id = Column(Integer, primary_key=True, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.id", ondelete="CASCADE"), unique=True)
    total_assets = Column(Integer, nullable=False)
    inspected_count = Column(Integer, nullable=False)
    missing_count = Column(Integer, nullable=False)
    lost_count = Column(Integer, nullable=False)
    missing_asset_ids = Column(ARRAY(Integer), default=[])
    lost_asset_ids = Column(ARRAY(Integer), default=[])
    is_email_sent = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

class ShiftSetting(Base):
    __tablename__ = "shift_settings"
    id = Column(Integer, primary_key=True, default=1)
    morning_start = Column(String(5), nullable=False)
    morning_end = Column(String(5), nullable=False)
    evening_start = Column(String(5), nullable=False)
    evening_end = Column(String(5), nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(50), nullable=False)
    target_id = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    payload = Column(Text, nullable=True)