"""
Extract expense policies from uploaded documents (PDF / image) using Gemini.
Returns a structured list of policies matching the PolicyCreate schema.

Fixes applied:
- Send PDF natively instead of converting to images (fixes RECITATION blocks)
- Reframed prompt to summarize rather than reproduce (avoids recitation filter)
- Added exponential backoff retry for 503 errors
- Cleaner response handling
"""

import json
import re
import time
from pathlib import Path
from dotenv import load_dotenv
import os
import google.genai as genai
from google.genai import types

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

MODEL = "gemini-2.5-flash-lite"
MAX_RETRIES = 3

# ── Prompt ─────────────────────────────────────────────────────────────────────
# Key changes vs old prompt:
#   - "synthesize" and "YOUR OWN WORDS" avoids the RECITATION safety filter
#   - Gemini was blocking because it thought it was being asked to reproduce content
POLICY_EXTRACTION_PROMPT = """
You are an expense compliance analyst.

TASK: Analyze the attached document and produce a structured data extract.
Do NOT quote or reproduce the document text verbatim.
Instead, synthesize each rule into a clean JSON object IN YOUR OWN WORDS.

For each distinct expense rule found, output one JSON object:
{
  "category": "Meals" | "Transport" | "Lodging" | "Office Supplies" | "Travel" | "Other",
  "region": "region/city/country this applies to, or 'all' if general",
  "rule_text": "YOUR OWN CONCISE SUMMARY of the rule — do not copy text verbatim. Include limits, conditions, exceptions.",
  "constraints": {
    "max_amount": the maximum allowed amount as a number (e.g. 50.0), or null if not specified,
    "currency": "3-letter currency code: GBP/USD/INR/EUR — detect from symbols £/$/ or context, default USD if unclear",
    "prohibited_items": ["list", "of", "prohibited", "items"] or [],
    "allowed_days": ["Monday", "Tuesday", ...] or [] if no day restrictions
  },
  "source_page": page number where this rule was found (1-indexed), or null
}

Output ONLY a raw JSON array — no markdown, no explanation, no code fences.

Guidelines:
- Extract EVERY distinct rule — do not skip any
- Separate rules for different regions (e.g. London vs India meals) into separate objects
- Detect currency from symbols: £=GBP, $=USD, ₹=INR, €=EUR
- List each prohibited item individually in prohibited_items
- Convert day restrictions (e.g. "weekdays only") to actual day names
- If the document has no expense policies, return []
"""


def extract_policies(file_path: str) -> list[dict]:
    """
    Extract expense policies from a document file.
    Supports PDF (multi-page) and images (JPG, PNG, WEBP).
    Returns a list of policy dicts matching PolicyCreate schema.
    """
    try:
        file_bytes = Path(file_path).read_bytes()
        ext = Path(file_path).suffix.lower()

        mime_map = {
            ".jpg":  "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png":  "image/png",
            ".pdf":  "application/pdf",
            ".webp": "image/webp",
        }
        mime_type = mime_map.get(ext, "image/jpeg")

        # ✅ FIX 1: Send PDF natively — do NOT convert to images
        # Converting to images triggered Gemini's RECITATION filter
        content_parts = [
            types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
            POLICY_EXTRACTION_PROMPT,
        ]

        print(f"Policy extractor: sending {ext} file ({len(file_bytes)//1024}KB) to Gemini...")
        policies = _call_gemini(content_parts)

        if policies:
            print(f"Policy extractor: extracted {len(policies)} policies")
        else:
            print("Policy extractor: no policies could be extracted")

        return policies

    except Exception as e:
        print(f"Policy extraction failed: {e}")
        return []


def _call_gemini(content_parts: list) -> list[dict]:
    """
    Send content + prompt to Gemini with retry logic.
    Retries on 503 (server overload) with exponential backoff.
    Does NOT retry on RECITATION (prompt issue, not transient).
    """
    last_error = None

    for attempt in range(MAX_RETRIES):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=content_parts,
            )

            # ── Check finish reason ────────────────────────────────────────────
            finish_reason = None
            raw_text = None

            if hasattr(response, "candidates") and response.candidates:
                candidate = response.candidates[0]

                if hasattr(candidate, "finish_reason"):
                    finish_reason = str(candidate.finish_reason)
                    print(f"Gemini finish_reason: {finish_reason}")

                # ✅ FIX 2: RECITATION means the prompt needs changing, not retrying
                if finish_reason and "RECITATION" in finish_reason:
                    print("Gemini blocked response due to RECITATION filter.")
                    print("Tip: ensure your prompt says 'summarize in your own words'")
                    return []

                # Try getting text from response
                if response.text is not None:
                    raw_text = response.text.strip()
                elif candidate.content:
                    for part in candidate.content.parts:
                        if hasattr(part, "text") and part.text:
                            raw_text = part.text.strip()
                            break

            elif response.text is not None:
                raw_text = response.text.strip()

            if not raw_text:
                print("Gemini returned empty response")
                return []

            # ── Parse JSON ─────────────────────────────────────────────────────
            # Strip markdown fences if Gemini added them despite instructions
            raw_text = re.sub(r"```json|```", "", raw_text).strip()

            policies = json.loads(raw_text)
            if not isinstance(policies, list):
                policies = [policies]

            return [_clean_policy(p) for p in policies]

        except json.JSONDecodeError:
            preview = raw_text[:300] if raw_text else "None"
            print(f"Gemini returned invalid JSON: {preview}")
            return []

        except Exception as e:
            error_str = str(e)
            last_error = e

            # ✅ FIX 3: Retry only on 503 (transient server overload)
            if "503" in error_str and attempt < MAX_RETRIES - 1:
                wait = 2 ** attempt  # 1s → 2s → 4s
                print(f"503 error on attempt {attempt + 1}, retrying in {wait}s...")
                time.sleep(wait)
                continue

            # 429 quota error — no point retrying
            if "429" in error_str:
                print(f"Quota exceeded: {error_str}")
                return []

            print(f"Gemini API call failed: {error_str}")
            return []

    print(f"All {MAX_RETRIES} attempts failed. Last error: {last_error}")
    return []


def _clean_policy(raw: dict) -> dict:
    """Normalize an extracted policy to match PolicyCreate schema."""
    valid_categories = {
        "Meals", "Transport", "Lodging", "Office Supplies", "Travel", "Other"
    }
    category = raw.get("category", "Other")
    if category not in valid_categories:
        category = "Other"

    constraints = raw.get("constraints", {}) or {}

    return {
        "category": category,
        "region": raw.get("region", "all") or "all",
        "rule_text": raw.get("rule_text", ""),
        "constraints": {
            "max_amount":       _safe_float(constraints.get("max_amount")),
            "currency":         (constraints.get("currency") or "USD").upper()[:3],
            "prohibited_items": constraints.get("prohibited_items") or [],
            "allowed_days":     constraints.get("allowed_days") or [],
        },
        "source_page": _safe_int(raw.get("source_page")),
    }


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _safe_int(val) -> int | None:
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None