import httpx
from app.config import DEEPGRAM_API_KEY

DEEPGRAM_URL = "https://api.deepgram.com/v1/listen"


def transcribe_audio(audio_bytes: bytes, content_type: str = "audio/webm") -> str:
    """Send audio bytes to Deepgram, return transcribed text."""
    response = httpx.post(
        DEEPGRAM_URL,
        headers={
            "Authorization": f"Token {DEEPGRAM_API_KEY}",
            "Content-Type": content_type,
        },
        params={
            "model": "nova-2",
            "detect_language": "true",
            "smart_format": "true",
        },
        content=audio_bytes,
        timeout=30.0,
    )
    response.raise_for_status()
    data = response.json()
    transcript = data["results"]["channels"][0]["alternatives"][0]["transcript"]
    return transcript
