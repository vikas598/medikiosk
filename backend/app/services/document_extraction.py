from io import BytesIO
from pathlib import Path

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


def _extract_pdf_text(content: bytes) -> str:
    reader = PdfReader(BytesIO(content))
    text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()
    if text:
        return text

    pdf = fitz.open(stream=content, filetype="pdf")
    try:
        ocr_text = []
        for page in pdf:
            pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            image = Image.frombytes("RGB", [pixmap.width, pixmap.height], pixmap.samples)
            ocr_text.append(_ocr_image(image))
        return "\n".join(ocr_text).strip()
    finally:
        pdf.close()


def _ocr_image(image: Image.Image) -> str:
    return pytesseract.image_to_string(image).strip()
