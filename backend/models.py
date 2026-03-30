from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum


# ── Enums ──────────────────────────────────────────────

class Role(str, Enum):
    employee = "employee"
    auditor = "auditor"


class ExpenseCategory(str, Enum):
    meals = "Meals"
    transport = "Transport"
    lodging = "Lodging"
    office_supplies = "Office Supplies"
    travel = "Travel"
    other = "Other"


class AuditStatus(str, Enum):
    approved = "approved"
    flagged = "flagged"
    rejected = "rejected"


class RiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class NotificationType(str, Enum):
    approved = "approved"
    flagged = "flagged"
    rejected = "rejected"
    override = "override"


# ── Users ──────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Role = Role.employee
    department: Optional[str] = None
    region: Optional[str] = None


class UserOut(BaseModel):
    id: str = Field(alias="_id")
    name: str
    email: EmailStr
    role: Role
    department: Optional[str] = None
    region: Optional[str] = None
    created_at: datetime

    class Config:
        populate_by_name = True


# ── Claims ─────────────────────────────────────────────

class ReceiptItem(BaseModel):
    name: str
    quantity: Optional[int] = 1
    price: float


class ExtractedData(BaseModel):
    vendor_name: Optional[str] = None
    items: Optional[list[ReceiptItem]] = []
    total: Optional[float] = None
    date: Optional[str] = None
    raw_text: Optional[str] = None


class AuditResult(BaseModel):
    status: AuditStatus
    risk_level: RiskLevel
    explanation: str
    policy_snippet: Optional[str] = None
    violations: list[str] = []


class Override(BaseModel):
    new_status: AuditStatus
    comment: str
    overridden_at: datetime = Field(default_factory=datetime.utcnow)


class OverrideStored(BaseModel):
    auditor_id:str
    new_status: AuditStatus
    comment: str
    overridden_at: datetime = Field(default_factory=datetime.utcnow)

class ClaimCreate(BaseModel):
    employee_id: str
    receipt_image_url: Optional[str] = None
    description: str
    business_purpose: str
    category: ExpenseCategory
    amount: float
    currency: str = "GBP"
    expense_date: datetime


class ClaimOut(BaseModel):
    id: str = Field(alias="_id")
    employee_id: str
    receipt_image_url: Optional[str] = None
    description: str
    business_purpose: str
    category: ExpenseCategory
    amount: float
    currency: str
    expense_date: datetime
    extracted_data: Optional[ExtractedData] = None
    audit_result: Optional[AuditResult] = None
    override: Optional[Override] = None
    final_status: Optional[AuditStatus] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


# ── Policies ───────────────────────────────────────────

class PolicyConstraints(BaseModel):
    max_amount: Optional[float] = None
    currency: str = "GBP"
    prohibited_items: list[str] = []
    allowed_days: list[str] = []


class PolicyCreate(BaseModel):
    category: ExpenseCategory
    region: str = "all"
    rule_text: str
    constraints: PolicyConstraints
    source_page: Optional[int] = None


class PolicyOut(BaseModel):
    id: str = Field(alias="_id")
    category: ExpenseCategory
    region: str
    rule_text: str
    constraints: PolicyConstraints
    source_page: Optional[int] = None
    embedding: Optional[list[float]] = None
    updated_at: datetime

    class Config:
        populate_by_name = True


# ── Notifications ──────────────────────────────────────

class NotificationCreate(BaseModel):
    user_id: str
    claim_id: str
    type: NotificationType
    message: str


class NotificationOut(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    claim_id: str
    type: NotificationType
    message: str
    is_read: bool = False
    created_at: datetime

    class Config:
        populate_by_name = True
