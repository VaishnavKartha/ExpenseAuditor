
import os
import json
import re
from datetime import datetime
from dotenv import load_dotenv
import google.genai as genai
from google.genai import types

from config import policies_collection
load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))




async def get_relevant_policies(category: str, region: str = "all") -> list[dict]:
    """
    Fetch policies matching the expense category and region.
    Falls back to region='all' if no region-specific policy exists.
    """
    query = {"category": category}

  
    if region and region != "all":
        query["region"] = region
        cursor = policies_collection.find(query)
        policies = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            policies.append(doc)

        if policies:
            return policies

      
        query["region"] = "all"

    cursor = policies_collection.find(query)
    policies = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        policies.append(doc)

    return policies



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
        return None 

  
    amount_in_gbp = amount / from_rate
    return round(amount_in_gbp * to_rate, 2)




def check_constraints(extracted_data: dict, policies: list[dict]) -> list[str]:
    
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




_GROUP_KEYWORDS = [
    "team building", "team lunch", "team dinner", "team outing",
    "group dinner", "group lunch", "group meeting",
    "department lunch", "department dinner",
    "celebration", "farewell", "welcome party", "offsite",
    "all-hands", "workshop", "training session",
]


_CLIENT_KEYWORDS = [
    "client meeting", "client lunch", "client dinner",
    "vendor meeting", "partner meeting", "stakeholder",
    "business development", "sales meeting", "pitch",
    "investor", "board meeting",
]

_CATEGORY_MISMATCH = {
    "Transport": ["lunch", "dinner", "breakfast", "meal", "food", "catering", "hotel", "accommodation"],
    "Meals":     ["taxi", "uber", "flight", "train ticket", "bus ticket", "mileage", "fuel", "parking"],
    "Lodging":   ["taxi", "uber", "lunch", "dinner", "flight", "fuel"],
    "Office Supplies": ["lunch", "dinner", "taxi", "hotel", "flight"],
}


def check_contextual_flags(
    business_purpose: str,
    extracted_data: dict,
    category: str,
) -> list[str]:
    
    flags = []
    purpose_lower = (business_purpose or "").lower().strip()
    items = extracted_data.get("items") or []
    total = extracted_data.get("total") or 0
    expense_date_str = extracted_data.get("date")
    num_items = len(items)

 
    if len(purpose_lower) < 5:
        flags.append(
            "Business purpose is too vague or missing. "
            "A clear justification is required for all expense claims."
        )
        return flags 

    is_group_claim = any(kw in purpose_lower for kw in _GROUP_KEYWORDS)
    if is_group_claim:
        if num_items <= 1 and total > 0:
            flags.append(
                f"Business purpose mentions a group activity "
                f"('{business_purpose}'), but the receipt contains only "
                f"{num_items} item(s). Group events typically have multiple items."
            )
     
        if 0 < total < 15:
            flags.append(
                f"Business purpose mentions a group activity "
                f"('{business_purpose}'), but total is only "
                f"{extracted_data.get('currency', '')} {total}, "
                f"which is unusually low for a group expense."
            )

 
    is_client_claim = any(kw in purpose_lower for kw in _CLIENT_KEYWORDS)
    if is_client_claim and expense_date_str:
        try:
            expense_date = datetime.strptime(expense_date_str, "%Y-%m-%d")
            day_name = expense_date.strftime("%A")
            if day_name in ("Saturday", "Sunday"):
                flags.append(
                    f"Business purpose mentions a client/formal activity "
                    f"('{business_purpose}'), but the expense date falls on "
                    f"{day_name}. Client meetings on weekends are unusual "
                    f"and may require additional justification."
                )
        except ValueError:
            pass

   
    mismatch_keywords = _CATEGORY_MISMATCH.get(category, [])
    for kw in mismatch_keywords:
        if kw in purpose_lower:
            flags.append(
                f"Category '{category}' may not match the business purpose: "
                f"'{business_purpose}' mentions '{kw}', which typically belongs "
                f"to a different expense category."
            )
            break 


    personal_keywords = [
        "personal", "birthday", "anniversary", "family",
        "friend", "date night", "vacation", "holiday",
    ]
    for kw in personal_keywords:
        if kw in purpose_lower:
            flags.append(
                f"Business purpose '{business_purpose}' contains the term "
                f"'{kw}', which suggests a personal expense. "
                f"Personal expenses are not reimbursable."
            )
            break

    return flags



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

## Business Purpose (stated by employee)
{business_purpose}

## Expense Category
{category}

## Applicable Expense Policies
{policies_text}

## Pre-check Violations (already detected)
{violations}

## Contextual Flags (already detected)
{contextual_flags}

## Instructions
Analyze the receipt against the policies. You MUST perform ALL of these checks:

### 1. Amount & Constraint Checks
- Is the total amount within policy limits? (CONVERT CURRENCIES FIRST)
- Are any items prohibited by policy?

### 2. Contextual Audit (CRITICAL)
Carefully compare the employee's stated **Business Purpose** against the actual
receipt data to detect inconsistencies:
- **Group vs. Individual**: If the purpose claims a group event (team lunch,
  team building, department dinner), does the receipt support it? Look for:
  - Multiple items/portions on the receipt
  - An amount consistent with multiple people
  - Example red flag: "Team Building dinner" but receipt shows 1 sandwich for £6
- **Client/Formal Activity Timing**: Is a client meeting claimed on a weekend
  or public holiday? This is unusual and should be flagged.
- **Category-Purpose Alignment**: Does the stated purpose match the expense
  category? e.g., claiming "client lunch" under Transport is suspicious.
- **Plausibility**: Does the amount make sense for the stated purpose?
  e.g., a £200 "solo working lunch" is implausible.
- **Personal Expense Indicators**: Does the purpose or receipt suggest a
  personal expense disguised as business? Look for personal items, family
  references, non-business venues.

### 3. Date & Day Checks
- Are there any contextual red flags with the expense date?
  (e.g., weekend claims for weekday-only categories)

Return ONLY a valid JSON object — no markdown, no explanation:
{{
  "status": "approved" | "flagged" | "rejected",
  "risk_level": "low" | "medium" | "high",
  "explanation": "A 1-2 sentence explanation citing the specific policy rule. Include currency conversion if applicable. If contextual issues exist, mention them.",
  "policy_snippet": "The specific policy text that applies",
  "violations": ["list", "of", "specific", "violations"]
}}

Rules:
- If pre-check violations OR contextual flags exist, the status must be "rejected" or "flagged"
- "approved" = fully compliant, no concerns, purpose aligns with receipt
- "flagged" = minor discrepancy, contextual concern, or needs human review
- "rejected" = clear policy violation or strong contextual inconsistency
- Always cite the specific policy rule in the explanation
- When amounts are in different currencies, convert before comparing
- If contextual flags were pre-detected, factor them into your decision
"""


async def audit_claim(
    extracted_data: dict,
    category: str,
    business_purpose: str,
    region: str = "all",
) -> dict:
    

    policies = await get_relevant_policies(category, region)

    if not policies:
 
        return {
            "status": "flagged",
            "risk_level": "medium",
            "explanation": f"No expense policies found for category '{category}'. Flagged for manual auditor review.",
            "policy_snippet": None,
            "violations": ["No matching policy found for this expense category"],
        }

    violations = check_constraints(extracted_data, policies)


    contextual_flags = check_contextual_flags(
        business_purpose=business_purpose,
        extracted_data=extracted_data,
        category=category,
    )
    if contextual_flags:
        print(f"Contextual flags detected: {contextual_flags}")


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
    contextual_str = "\n".join(contextual_flags) if contextual_flags else "None detected"

    prompt = AUDIT_PROMPT.format(
        receipt_data=receipt_str,
        business_purpose=business_purpose,
        category=category,
        policies_text=policies_text,
        violations=violations_str,
        contextual_flags=contextual_str,
    )

    try:
        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=[prompt],
        )

        raw_text = response.text.strip()
        raw_text = re.sub(r"```json|```", "", raw_text).strip()
        result = json.loads(raw_text)

 
        ai_violations = result.get("violations", [])
        all_violations = list(set(violations + contextual_flags + ai_violations))
        result["violations"] = all_violations

        if (violations or contextual_flags) and result.get("status") == "approved":
            result["status"] = "flagged"
            result["risk_level"] = "medium"

        print(f"Audit result: status={result.get('status')}, "
              f"risk={result.get('risk_level')}, "
              f"violations={len(all_violations)}")

        return result

    except json.JSONDecodeError:
        print(f"Gemini audit returned invalid JSON: {response.text[:200]}")
        return _fallback_result(violations + contextual_flags)

    except Exception as e:
        print(f"Gemini audit failed: {e}")
        return _fallback_result(violations + contextual_flags)


def _fallback_result(violations: list[str]) -> dict:

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
