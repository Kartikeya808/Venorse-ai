import logging
import time
from typing import Optional

from openai import OpenAI, RateLimitError

from app.config import settings

logger = logging.getLogger(__name__)

_client: Optional[OpenAI] = None

MAX_RETRIES = 3
BASE_DELAY = 2.0


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        if not settings.openrouter_api_key:
            raise ValueError(
                "OPENROUTER_API_KEY is required but not set. "
                "Add it to langgraph/.env or set it as an environment variable."
            )
        _client = OpenAI(
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
            default_headers={
                "HTTP-Referer": settings.openrouter_app_url,
                "X-Title": settings.openrouter_app_name,
            },
        )
    return _client


def call_llm(
    system_prompt: str,
    user_prompt: str,
    model: Optional[str] = None,
    temperature: float = 0.3,
    max_tokens: int = 4096,
) -> str:
    client = _get_client()
    model = model or settings.openrouter_model
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    max_tokens = min(max_tokens, 32768)

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            content = resp.choices[0].message.content or ""
            if not content.strip():
                logger.warning("OpenRouter returned empty content for model=%s", model)
            return content
        except RateLimitError as e:
            if attempt < MAX_RETRIES:
                delay = BASE_DELAY * (2 ** (attempt - 1))
                logger.warning(
                    "OpenRouter rate limited (attempt %d/%d), retrying in %.1fs: %s",
                    attempt, MAX_RETRIES, delay, e,
                )
                time.sleep(delay)
            else:
                logger.error("OpenRouter rate limited after %d attempts: %s", MAX_RETRIES, e)
                return f"[OpenRouter API error: rate limit exceeded - {e}]"
        except Exception as e:
            logger.error("OpenRouter API call failed: %s", e)
            return f"[OpenRouter API error: {e}]"
