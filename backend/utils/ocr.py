import json
import re
from pathlib import Path
from dotenv import load_dotenv
import os
import google.genai as genai
from google.genai import types

load_dotenv()

# ── Client setup (new SDK uses a client, not module-level configure) ───────────
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# ── Prompt ─────────────────────────────────────────────────────────────────────
GEMINI_PROMPT = """
You are an OCR assistant that extracts data from expense receipts.

Look at this receipt image carefully and extract the following fields.

Return ONLY a valid JSON object — no markdown, no explanation, no code fences.

{
  "vendor_name": "name of the shop, restaurant or service provider, or null",
  "total": the final total amount as a number (e.g. 85.00), or null,
  "currency": "3-letter currency code like GBP, USD, INR — detect from symbol £=$=₹, or null",
  "date": "expense date in YYYY-MM-DD format, or null",
  "items": [
    {"name": "item name", "quantity": 1, "price": 0.00}
  ],
  "confidence": "high if receipt is clear, medium if partially readable, low if blurry or unreadable"
}

Rules:
- If you cannot read a field clearly, set it to null
- Do not guess amounts — only extract what is clearly printed
- Items array can be empty [] if items are not itemized on the receipt
- For confidence: high = all fields readable, medium = some fields unclear, low = mostly unreadable
"""


# ── Main extract function ──────────────────────────────────────────────────────

def extract(file_path: str) -> dict:
   
    try:
        # Step 1: Read file from disk
        file_bytes = Path(file_path).read_bytes()

        # Step 2: Detect mime type from extension
        ext = Path(file_path).suffix.lower()
        mime_map = {
            ".jpg":  "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png":  "image/png",
            ".pdf":  "application/pdf",
            ".webp": "image/webp",
        }
        mime_type = mime_map.get(ext, "image/jpeg")

       
        if mime_type == "application/pdf":
            file_bytes, mime_type = _pdf_to_image_bytes(file_bytes)

       
        image_part = types.Part.from_bytes(
            data=file_bytes,
            mime_type=mime_type,
        )

       
        response = client.models.generate_content(
            model="gemini-flash-latest",  
            contents=[image_part, GEMINI_PROMPT],
        )

      
        raw_text = response.text.strip()
        raw_text = re.sub(r"```json|```", "", raw_text).strip()

        result = json.loads(raw_text)
        print(f"Gemini extracted: vendor={result.get('vendor_name')}, "
              f"total={result.get('total')}, confidence={result.get('confidence')}")
        return result

    except json.JSONDecodeError:
        print(f"Gemini returned invalid JSON: {response.text[:200]}")
        return _empty_result()

    except Exception as e:
        print(f"Gemini extraction failed: {e}")
        return _empty_result()




def _pdf_to_image_bytes(pdf_bytes: bytes) -> tuple[bytes, str]:
    """Convert first page of a PDF to PNG bytes for Gemini."""
    import fitz
    pdf  = fitz.open(stream=pdf_bytes, filetype="pdf")
    pix  = pdf[0].get_pixmap(dpi=200)
    return pix.tobytes("png"), "image/png"


def _empty_result() -> dict:
    return {
        "vendor_name": None,
        "total":       None,
        "currency":    None,
        "date":        None,
        "items":       [],
        "confidence":  "low",
    }

