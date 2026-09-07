from collections.abc import Iterator
from threading import Lock

from elevenlabs import ElevenLabs

from app.config import ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID


MODEL_NAME = "eleven_multilingual_v2"


class ElevenLabsTTS:
    """One process-wide ElevenLabs client shared by all TTS requests."""

    def __init__(self) -> None:
        if not ELEVENLABS_API_KEY:
            raise RuntimeError("ELEVENLABS_API_KEY is not configured")
        self.client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
        self.lock = Lock()

    def generate(self, text: str, language: str) -> bytes:
        return b"".join(self.stream(text, language))

    def stream(self, text: str, language: str) -> Iterator[bytes]:
        language_code = language.lower().split("-", 1)[0]
        with self.lock:
            audio = self.client.text_to_speech.stream(
                text=text,
                voice_id=ELEVENLABS_VOICE_ID,
                model_id=MODEL_NAME,
                output_format="mp3_22050_32",
                language_code=language_code,
                optimize_streaming_latency=4,
            )
            yield from audio


tts_client: ElevenLabsTTS | None = None


def load_tts_client() -> None:
    global tts_client
    if tts_client is None:
        try:
            tts_client = ElevenLabsTTS()
        except RuntimeError as error:
            print(f"  WARNING - TTS client unavailable: {error}")


def synthesize_speech(text: str, language: str) -> bytes:
    if tts_client is None:
        raise RuntimeError("TTS client is not loaded")
    return tts_client.generate(text, language)


def stream_speech(text: str, language: str) -> Iterator[bytes]:
    if tts_client is None:
        raise RuntimeError("TTS client is not loaded")
    yield from tts_client.stream(text, language)