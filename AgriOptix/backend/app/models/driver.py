from datetime import date, datetime

from sqlalchemy import Date, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class Driver(Base):
    __tablename__ = "drivers"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    mobile_number: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        unique=True,
        index=True,
    )

    preferred_language: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="English",
    )

    current_location: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    vehicle_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    vehicle_number: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        unique=True,
        index=True,
    )

    driving_license_number: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    license_expiry_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    vehicle_capacity: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    experience: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    availability: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    preferred_routes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    password_hash: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    password_salt: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="ACTIVE",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )