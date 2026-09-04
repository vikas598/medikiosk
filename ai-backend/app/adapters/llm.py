import json

from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, SystemMessage

from app.config import LLM_MAX_TOKENS, LLM_MODEL, LLM_TEMPERATURE

# Initialize the model once — reused across all calls
llm = init_chat_model(
    LLM_MODEL,
    temperature=LLM_TEMPERATURE,
    max_tokens=LLM_MAX_TOKENS,
)


def call_llm(system_prompt: str, user_message: str, max_tokens: int | None = None) -> str:
    """Send a system prompt + user message to the LLM. Returns text response.
    Optional max_tokens overrides the default from config."""
    model = llm.bind(max_tokens=max_tokens) if max_tokens else llm
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_message),
    ]
    response = model.invoke(messages)
    return response.content


def call_llm_json(system_prompt: str, user_message: str, max_tokens: int | None = None) -> dict:
    """Send a system prompt + user message to the LLM. Forces JSON output.
    Returns a parsed Python dictionary.
    Optional max_tokens overrides the default from config."""
    bind_kwargs = {"response_format": {"type": "json_object"}}
    if max_tokens:
        bind_kwargs["max_tokens"] = max_tokens
    model = llm.bind(**bind_kwargs)
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_message),
    ]
    response = model.invoke(messages)
    return json.loads(response.content)


# Quick test — run this file directly to verify the LLM connection works
if __name__ == "__main__":
    # Test 1: Basic text call
    print("--- Test 1: Basic text call ---")
    result = call_llm(
        system_prompt="You are a helpful medical assistant.",
        user_message="What is SOCRATES in clinical medicine? Answer in 2 sentences.",
    )
    print(result)
    print()

    # Test 2: JSON call
    print("--- Test 2: JSON call ---")
    result_json = call_llm_json(
        system_prompt="You are a helpful assistant. Always respond in JSON.",
        user_message='What is SOCRATES in clinical medicine? Respond as {"answer": "..."}',
    )
    print(result_json)
    print(f"Type: {type(result_json)}")
