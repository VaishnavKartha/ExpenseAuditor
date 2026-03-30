"""
Policy Cross-Reference & Audit Engine
──────────────────────────────────────
Compares extracted receipt data against stored expense policies.
Uses hard constraint checks + Gemini AI for contextual analysis.
"""

import json
import re
from datetime import datetime

import google.genai as genai
from google.genai import types

from config import GEMINI_API_KEY, policies_collection

client = genai.Client(api_key=GEMINI_API_KEY)


# ── Policy retrieval ───────────────────────────────────────────────────────────

async def get_relevant_policies(category: str, region: str = "all") -> list[dict]:
    """
    Fetch policies matching the expense category and region.
    Falls back to region='all' if no region-specific policy exists.
    """
    query = {"category": category}

    # Try region-specific first
    if region and region != "all":
        query["region"] = region
        cursor = policies_collection.find(query)
        policies = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            policies.append(doc)

        if policies:
            return policies

        # Fallback to "all" region
        query["region"] = "all"

    cursor = policies_collection.find(query)
    policies = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        policies.append(doc)

    return policies


# ── Currency conversion (approximate rates to a common base: GBP) ──────────────

# Rates: how many units of each currency = 1 GBP
APPROX_RATES_TO_GBP = {
    "GBP": 1.0,
    "USD": 1.27,
    "EUR": 1.17,
    "INR": 106.0,
    "CAD": 1.72,
    "AUD": 1.94,
    "JPY": 191.0,
}


def _convert_to_policy_currency(amount: float, from_currency: str, to_currency: str) -> float | None:
    """Convert amount between currencies using approximate rates.
    Returns None if conversion is not possible."""
    from_c = (from_currency or "").upper()
    to_c = (to_currency or "").upper()

    if from_c == to_c:
        return amount

    from_rate = APPROX_RATES_TO_GBP.get(from_c)
    to_rate = APPROX_RATES_TO_GBP.get(to_c)

    if from_rate is None or to_rate is None:
        return None  # Unknown currency — skip hard check, let Gemini handle it

    # Convert: amount_in_from → GBP → to_currency
    amount_in_gbp = amount / from_rate
    return round(amount_in_gbp * to_rate, 2)


# ── Hard constraint checks ─────────────────────────────────────────────────────

def check_constraints(extracted_data: dict, policies: list[dict]) -> list[str]:
    """
    Run deterministic constraint checks before calling AI.
    Currency-aware: converts receipt amount to policy currency before comparing.
    Returns a list of violation strings.
    """
    violations = []
    total = extracted_data.get("total") or 0
    receipt_currency = (extracted_data.get("currency") or "").upper()
    items = extracted_data.get("items") or []
    expense_date_str = extracted_data.get("date")
    item_names = [item.get("name", "").lower() for item in items]

    for policy in policies:
        constraints = policy.get("constraints", {})
        policy_currency = (constraints.get("currency") or "GBP").upper()

        # Check max amount (currency-aware)
        max_amount = constraints.get("max_amount")
        if max_amount and total:
            converted = _convert_to_policy_currency(total, receipt_currency, policy_currency)
            if converted is not None and converted > max_amount:
                violations.append(
                    f"Amount {receipt_currency} {total} "
                    f"(≈ {policy_currency} {converted}) exceeds the limit of "
                    f"{policy_currency} {max_amount} "
                    f"for {policy.get('category', 'this category')} "
                    f"(region: {policy.get('region', 'all')})"
                )

        # Check prohibited items
        prohibited = constraints.get("prohibited_items", [])
        for prohibited_item in prohibited:
            for item_name in item_names:
                if prohibited_item.lower() in item_name:
                    violations.append(
                        f"Prohibited item detected: '{prohibited_item}' "
                        f"found in receipt item '{item_name}'"
                    )

        # Check allowed days
        allowed_days = constraints.get("allowed_days", [])
        if allowed_days and expense_date_str:
            try:
                expense_date = datetime.strptime(expense_date_str, "%Y-%m-%d")
                day_name = expense_date.strftime("%A")
                if day_name not in allowed_days:
                    violations.append(
                        f"Expense on {day_name} is not allowed. "
                        f"Allowed days: {', '.join(allowed_days)}"
                    )
            except ValueError:
                pass

    return violations


# ── Gemini audit ───────────────────────────────────────────────────────────────

AUDIT_PROMPT = """
You are a corporate expense auditor AI. Your job is to compare extracted receipt
data against company expense policies and determine compliance.

## IMPORTANT: Currency Handling
The receipt currency may differ from the policy currency. When comparing amounts:
- Convert the receipt amount to the policy currency before comparing.
- Use approximate rates: 1 GBP ≈ 1.27 USD ≈ 1.17 EUR ≈ 106 INR
- Clearly state the converted amount in your explanation.

## Extracted Receipt Data
{receipt_data}

## Business Purpose
{business_purpose}

## Applicable Expense Policies
{policies_text}

## Pre-check Violations (already detected)
{violations}

## Instructions
Analyze the receipt against the policies. Consider:
1. Is the total amount within policy limits? (CONVERT CURRENCIES FIRST)
2. Are any items prohibited by policy?
3. Does the business purpose align with the expense category?
4. Are there any contextual red flags (e.g., weekend claims for weekday-only categories)?

Return ONLY a valid JSON object — no markdown, no explanation:
{{
  "status": "approved" | "flagged" | "rejected",
  "risk_level": "low" | "medium" | "high",
  "explanation": "A 1-2 sentence explanation citing the specific policy rule. Include currency conversion if applicable.",
  "policy_snippet": "The specific policy text that applies",
  "violations": ["list", "of", "specific", "violations"]
}}

Rules:
- If pre-check violations exist, the status must be "rejected" or "flagged"
- "approved" = fully compliant, no concerns
- "flagged" = minor discrepancy or needs human review
- "rejected" = clear policy violation
- Always cite the specific policy rule in the explanation
- When amounts are in different currencies, convert before comparing
"""


async def audit_claim(
    extracted_data: dict,
    category: str,
    business_purpose: str,
    region: str = "all",
) -> dict:
    """
    Full audit pipeline:
    1. Fetch matching policies
    2. Run hard constraint checks
    3. Send to Gemini for contextual analysis
    4. Return structured audit result
    """
    # Step 1: Get relevant policies
    policies = await get_relevant_policies(category, region)

    if not policies:
        # No policies defined for this category — auto-flag for human review
        return {
            "status": "flagged",
            "risk_level": "medium",
            "explanation": f"No expense policies found for category '{category}'. Flagged for manual auditor review.",
            "policy_snippet": None,
            "violations": ["No matching policy found for this expense category"],
        }

    # Step 2: Hard constraint checks
    violations = check_constraints(extracted_data, policies)

    # Step 3: Build policy text for Gemini
    policies_text = "\n\n".join([
        f"Category: {p.get('category')}, Region: {p.get('region')}\n"
        f"Rule: {p.get('rule_text')}\n"
        f"Constraints: max_amount={p.get('constraints', {}).get('max_amount')} "
        f"{p.get('constraints', {}).get('currency', 'GBP')}, "
        f"prohibited_items={p.get('constraints', {}).get('prohibited_items', [])}, "
        f"allowed_days={p.get('constraints', {}).get('allowed_days', [])}"
        for p in policies
    ])

    receipt_str = json.dumps(extracted_data, indent=2, default=str)
    violations_str = "\n".join(violations) if violations else "None detected"

    prompt = AUDIT_PROMPT.format(
        receipt_data=receipt_str,
        business_purpose=business_purpose,
        policies_text=policies_text,
        violations=violations_str,
    )

    try:
        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=[prompt],
        )

        raw_text = response.text.strip()
        raw_text = re.sub(r"```json|```", "", raw_text).strip()
        result = json.loads(raw_text)

        # Merge pre-check violations with AI-detected ones
        ai_violations = result.get("violations", [])
        all_violations = list(set(violations + ai_violations))
        result["violations"] = all_violations

        # If hard violations exist, enforce at least "flagged"
        if violations and result.get("status") == "approved":
            result["status"] = "flagged"
            result["risk_level"] = "medium"

        print(f"Audit result: status={result.get('status')}, "
              f"risk={result.get('risk_level')}, "
              f"violations={len(all_violations)}")

        return result

    except json.JSONDecodeError:
        print(f"Gemini audit returned invalid JSON: {response.text[:200]}")
        return _fallback_result(violations)

    except Exception as e:
        print(f"Gemini audit failed: {e}")
        return _fallback_result(violations)


def _fallback_result(violations: list[str]) -> dict:
    """Fallback when Gemini fails — use constraint checks only."""
    if violations:
        return {
            "status": "flagged",
            "risk_level": "high",
            "explanation": "Automated policy check failed. Manual review required. "
                           f"Constraint violations: {'; '.join(violations)}",
            "policy_snippet": None,
            "violations": violations,
        }
    return {
        "status": "flagged",
        "risk_level": "medium",
        "explanation": "AI audit service unavailable. Flagged for manual review.",
        "policy_snippet": None,
        "violations": ["Audit service temporarily unavailable"],
    }
