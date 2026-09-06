"""add_medicine_categories_and_review_workflow

Revision ID: a91f4c2e8d10
Revises: 807ac94db43d
Create Date: 2026-09-06
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "a91f4c2e8d10"
down_revision: Union[str, Sequence[str], None] = "807ac94db43d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DEFAULT_CATEGORIES = [
    "Giảm đau, hạ sốt",
    "Tim mạch / huyết áp",
    "Đái tháo đường",
    "Tiêu hoá",
    "Hô hấp",
    "Kháng sinh",
    "Vitamin / khoáng chất",
    "Da liễu / dùng ngoài",
    "Mắt / tai / mũi",
    "Thần kinh / giấc ngủ",
    "Khác",
]


def upgrade() -> None:
    op.create_table(
        "medicine_categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), server_default=sa.text("'active'"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_medicine_categories_id"), "medicine_categories", ["id"], unique=False)
    op.bulk_insert(
        sa.table("medicine_categories", sa.column("name", sa.String()), sa.column("status", sa.String())),
        [{"name": name, "status": "active"} for name in DEFAULT_CATEGORIES],
    )

    op.add_column("medicines", sa.Column("category_id", sa.Integer(), nullable=True))
    op.add_column("medicines", sa.Column("route", sa.String(length=50), nullable=True))
    op.add_column("medicines", sa.Column("is_high_alert", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column("medicines", sa.Column("storage_note", sa.Text(), nullable=True))
    op.add_column("medicines", sa.Column("created_by", sa.Integer(), nullable=True))
    op.add_column("medicines", sa.Column("approved_by", sa.Integer(), nullable=True))
    op.add_column("medicines", sa.Column("approved_at", postgresql.TIMESTAMP(timezone=True), nullable=True))
    op.create_index(op.f("ix_medicines_category_id"), "medicines", ["category_id"], unique=False)
    op.create_foreign_key("fk_medicines_category_id", "medicines", "medicine_categories", ["category_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_medicines_created_by", "medicines", "users", ["created_by"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_medicines_approved_by", "medicines", "users", ["approved_by"], ["id"], ondelete="SET NULL")
    op.create_check_constraint(
        "ck_medicines_status",
        "medicines",
        "status IN ('active', 'pending_review', 'inactive')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_medicines_status", "medicines", type_="check")
    op.drop_constraint("fk_medicines_approved_by", "medicines", type_="foreignkey")
    op.drop_constraint("fk_medicines_created_by", "medicines", type_="foreignkey")
    op.drop_constraint("fk_medicines_category_id", "medicines", type_="foreignkey")
    op.drop_index(op.f("ix_medicines_category_id"), table_name="medicines")
    op.drop_column("medicines", "approved_at")
    op.drop_column("medicines", "approved_by")
    op.drop_column("medicines", "created_by")
    op.drop_column("medicines", "storage_note")
    op.drop_column("medicines", "is_high_alert")
    op.drop_column("medicines", "route")
    op.drop_column("medicines", "category_id")

    op.drop_index(op.f("ix_medicine_categories_id"), table_name="medicine_categories")
    op.drop_table("medicine_categories")
