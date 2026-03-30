"""
Seed default expense policies into MongoDB.
Run once: python seed_policies.py
"""

import asyncio
from datetime import datetime, timezone
from config import policies_collection


DEFAULT_POLICIES = [
    # ── Meals ──────────────────────────────────────────────
    {
        "category": "Meals",
        "region": "all",
        "rule_text": (
            "Meal expenses must be for legitimate business purposes only. "
            "Maximum meal reimbursement is £50 per person per meal. "
            "Alcohol is strictly prohibited from reimbursement. "
            "Tips may not exceed 15% of the meal total. "
            "Group meals must list all attendees."
        ),
        "constraints": {
            "max_amount": 50.0,
            "currency": "GBP",
            "prohibited_items": ["alcohol", "beer", "wine", "spirits", "cocktail", "liquor"],
            "allowed_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        },
        "source_page": 12,
    },
    {
        "category": "Meals",
        "region": "London",
        "rule_text": (
            "London meal allowance is £65 per person per meal due to higher cost of living. "
            "All other meal policies apply. No alcohol reimbursement."
        ),
        "constraints": {
            "max_amount": 65.0,
            "currency": "GBP",
            "prohibited_items": ["alcohol", "beer", "wine", "spirits", "cocktail", "liquor"],
            "allowed_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        },
        "source_page": 13,
    },
    {
        "category": "Meals",
        "region": "New York",
        "rule_text": (
            "New York meal allowance is $75 per person per meal. "
            "No alcohol. Weekend meals only reimbursed during approved business travel."
        ),
        "constraints": {
            "max_amount": 75.0,
            "currency": "USD",
            "prohibited_items": ["alcohol", "beer", "wine", "spirits", "cocktail", "liquor"],
            "allowed_days": [],
        },
        "source_page": 14,
    },
    {
        "category": "Meals",
        "region": "India",
        "rule_text": (
            "India meal allowance is ₹800 per person per meal. "
            "Alcohol is strictly prohibited from reimbursement. "
            "All meal receipts must include GST details."
        ),
        "constraints": {
            "max_amount": 800.0,
            "currency": "INR",
            "prohibited_items": ["alcohol", "beer", "wine", "spirits", "cocktail", "liquor"],
            "allowed_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        },
        "source_page": 15,
    },

    # ── Transport ──────────────────────────────────────────
    {
        "category": "Transport",
        "region": "all",
        "rule_text": (
            "Transport expenses include taxis, ride-shares, public transport, and mileage. "
            "Ride-share/taxi maximum is £40 per trip. "
            "Mileage is reimbursed at £0.45 per mile for the first 10,000 miles. "
            "First-class train is not reimbursable unless pre-approved. "
            "Public transport is always reimbursable with receipt."
        ),
        "constraints": {
            "max_amount": 200.0,
            "currency": "GBP",
            "prohibited_items": ["first class", "limousine", "helicopter"],
            "allowed_days": [],
        },
        "source_page": 18,
    },
    {
        "category": "Transport",
        "region": "India",
        "rule_text": (
            "India transport allowance: auto/taxi maximum ₹500 per trip. "
            "Ride-share (Ola/Uber) reimbursed up to ₹3000 per day. "
            "First-class train is not reimbursable."
        ),
        "constraints": {
            "max_amount": 3000.0,
            "currency": "INR",
            "prohibited_items": ["first class", "limousine"],
            "allowed_days": [],
        },
        "source_page": 19,
    },

    # ── Lodging ────────────────────────────────────────────
    {
        "category": "Lodging",
        "region": "all",
        "rule_text": (
            "Hotel accommodation maximum is £120 per night for standard cities. "
            "Room service meals follow the Meals policy limits. "
            "Mini-bar charges are not reimbursable. "
            "Stays must be booked through the company travel portal when possible."
        ),
        "constraints": {
            "max_amount": 120.0,
            "currency": "GBP",
            "prohibited_items": ["mini-bar", "minibar", "pay-per-view", "spa"],
            "allowed_days": [],
        },
        "source_page": 22,
    },
    {
        "category": "Lodging",
        "region": "London",
        "rule_text": (
            "London hotel accommodation maximum is £200 per night. "
            "All other lodging policies apply."
        ),
        "constraints": {
            "max_amount": 200.0,
            "currency": "GBP",
            "prohibited_items": ["mini-bar", "minibar", "pay-per-view", "spa"],
            "allowed_days": [],
        },
        "source_page": 23,
    },
    {
        "category": "Lodging",
        "region": "India",
        "rule_text": (
            "India hotel accommodation maximum is ₹5000 per night for standard cities. "
            "Metro cities (Mumbai, Delhi, Bangalore) allow ₹8000 per night. "
            "Mini-bar and laundry are not reimbursable."
        ),
        "constraints": {
            "max_amount": 5000.0,
            "currency": "INR",
            "prohibited_items": ["mini-bar", "minibar", "laundry", "spa"],
            "allowed_days": [],
        },
        "source_page": 24,
    },

    # ── Office Supplies ────────────────────────────────────
    {
        "category": "Office Supplies",
        "region": "all",
        "rule_text": (
            "Office supply purchases up to £50 per item can be reimbursed without pre-approval. "
            "Items over £50 require manager approval. "
            "Personal electronics (headphones, speakers) are not reimbursable. "
            "Software licenses must go through the IT department."
        ),
        "constraints": {
            "max_amount": 50.0,
            "currency": "GBP",
            "prohibited_items": ["headphones", "speakers", "personal electronics", "gaming"],
            "allowed_days": [],
        },
        "source_page": 28,
    },

    # ── Travel ─────────────────────────────────────────────
    {
        "category": "Travel",
        "region": "all",
        "rule_text": (
            "Flights must be economy class for trips under 6 hours. "
            "Business class is allowed for flights over 6 hours with prior approval. "
            "Travel insurance is covered by the company. "
            "Maximum daily travel allowance is £250 (covering all expenses). "
            "All travel must be pre-approved by department manager."
        ),
        "constraints": {
            "max_amount": 2000.0,
            "currency": "GBP",
            "prohibited_items": ["first class", "upgrade"],
            "allowed_days": [],
        },
        "source_page": 32,
    },

    # ── Other ──────────────────────────────────────────────
    {
        "category": "Other",
        "region": "all",
        "rule_text": (
            "Miscellaneous expenses up to £30 may be claimed with receipt and justification. "
            "Anything over £30 requires pre-approval. "
            "Personal expenses are never reimbursable. "
            "Entertainment expenses require a list of attendees and business purpose."
        ),
        "constraints": {
            "max_amount": 30.0,
            "currency": "GBP",
            "prohibited_items": ["personal", "gift card", "gambling"],
            "allowed_days": [],
        },
        "source_page": 38,
    },
    {
        "category": "Other",
        "region": "India",
        "rule_text": (
            "Miscellaneous expenses up to ₹500 may be claimed with receipt and justification. "
            "Anything over ₹500 requires pre-approval. "
            "Personal expenses are never reimbursable."
        ),
        "constraints": {
            "max_amount": 500.0,
            "currency": "INR",
            "prohibited_items": ["personal", "gift card", "gambling"],
            "allowed_days": [],
        },
        "source_page": 39,
    },
]


async def seed():
    # Clear existing policies
    count = await policies_collection.count_documents({})
    if count > 0:
        print(f"Found {count} existing policies. Clearing...")
        await policies_collection.delete_many({})

    now = datetime.now(timezone.utc)
    for policy in DEFAULT_POLICIES:
        policy["embedding"] = None
        policy["updated_at"] = now

    result = await policies_collection.insert_many(DEFAULT_POLICIES)
    print(f"✅ Seeded {len(result.inserted_ids)} policies into MongoDB")


if __name__ == "__main__":
    asyncio.run(seed())
