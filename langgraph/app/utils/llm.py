import logging
import time
from typing import Optional

from groq import Groq, RateLimitError

from app.config import settings

logger = logging.getLogger(__name__)

_client: Optional[Groq] = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.groq_api_key)
    return _client


def call_llm(
    system_prompt: str,
    user_prompt: str,
    model: Optional[str] = None,
    temperature: float = 0.3,
    max_tokens: int = 4096,
) -> str:
    client = _get_client()
    model = model or settings.groq_llm_model
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    for attempt in range(3):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=min(max_tokens, 4000),
            )
            content = resp.choices[0].message.content or ""
            if not content.strip():
                logger.warning("Groq returned empty content for model=%s", model)
            return content
        except RateLimitError as e:
            wait = 2 ** (attempt + 1) * 5
            logger.warning("Groq rate limit (attempt %d/3), retrying in %ds: %s", attempt + 1, wait, e)
            time.sleep(wait)
        except Exception as e:
            logger.error("Groq API call failed: %s", e)
            return f"[Groq API error: {e}]"
    return "[Groq API error: rate limit exceeded after retries]"
