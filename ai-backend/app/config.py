import os

from dotenv import load_dotenv

load_dotenv()

# --- LLM Configuration ---
LLM_MODEL = os.getenv("LLM_MODEL", "groq:openai/gpt-oss-120b")
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0"))
LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "1024"))