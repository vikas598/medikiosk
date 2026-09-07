from io import BytesIO
from datetime import date, datetime
from pathlib import Path
import re
from typing import Any, cast

import fitz
import pytesseract
from PIL import Image
from pypdf import PdfReader

from app.config import TESSERACT_CMD

if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD


def extract_document_text(content: bytes, file_type: str | None, filename: str | None) -> str:
    """Extract text from supported medical documents, using OCR when needed."""
    document_type = (file_type or Path(filename or "").suffix.lower()).lower()

    if document_type == "application/pdf" or document_type == ".pdf":
        return _extract_pdf_text(content)
    if document_type in {"image/jpeg", "image/jpg", "image/png", ".jpg", ".jpeg", ".png"}:
        return _ocr_image(Image.open(BytesIO(content)))
    return ""


def extract_document_date(text: str) -> str | None:
    """Return the report date as YYYY-MM-DD when one is present in extracted text."""
    normalized_text = re.sub(r"\s+", " ", text).strip()
    labeled = re.search(
        r"(?:report|test|sample|specimen|collection|collected|issued|performed)\s*(?:date)?\s*[:\-]?\s*"
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}[/-][A-Za-z]{3,9}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})",
        normalized_text,
        re.IGNORECASE,
    )
    candidate = labeled.group(1) if labeled else _first_date_candidate(normalized_text)
    if not candidate:
        return None
    candidate = re.sub(r"\s*,\s*", ", ", candidate)
    for pattern in ("%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y", "%d/%b/%Y", "%d-%b-%Y", "%d/%B/%Y", "%d-%B-%Y", "%d %B %Y", "%d %b %Y", "%d %B, %Y", "%d %b, %Y", "%B %d, %Y", "%b %d, %Y"):
        try:
            return datetime.strptime(candidate, pattern).date().isoformat()
        except ValueError:
            continue
    return None


def _first_date_candidate(text: str) -> str | None:
    match = re.search(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{1,2}[/-][A-Za-z]{3,9}[/-]\d{2,4}\b|\b\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{4}\b|\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\b", text)
    return match.group(0) if match else None


def days_since_document_date(document_date: str | None) -> int | None:
    if not document_date:
        return None
    try:
        return max(0, (date.today() - date.fromisoformat(document_date)).days)
    except ValueError:
        return None


def _extract_pdf_text(content: bytes) -> str:
    reader = PdfReader(BytesIO(content))
    text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()
    if text:
        return text

    pdf = fitz.open(stream=content, filetype="pdf")
    try:
        ocr_text = []
        for page in pdf:
            pixmap = cast(Any, page).get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
            ocr_text.append(_ocr_image(image))
        return "\n".join(ocr_text).strip()
    finally:
        pdf.close()


def _ocr_image(image: Image.Image) -> str:
    return pytesseract.image_to_string(image).strip()
