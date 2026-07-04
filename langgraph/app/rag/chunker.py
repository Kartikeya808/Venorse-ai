import re
from typing import Generator
from app.config import settings

# Rough estimate: ~3000 chars per page for dense financial filings.
_CHARS_PER_PAGE = 3000


def chunk_text(text: str, chunk_size: int = None, overlap: int = None) -> Generator[tuple[str,dict],None,None]:
    chunk_size = chunk_size or settings.chunk_size
    overlap = overlap or settings.chunk_overlap
    paragraphs = re.split(r"\n\s*\n", text)
    current_chunk = ""
    current_len = 0
    char_offset = 0  # tracks actual character position in the source text
    chunk_index = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        para_len = len(para)

        if current_len + para_len > chunk_size and current_chunk:
            chunk_to_emit = current_chunk.strip()
            meta = {
                "chunk": chunk_index,
                "char_start": char_offset,
                "page": char_offset // _CHARS_PER_PAGE + 1,
            }
            yield chunk_to_emit, meta
            chunk_index += 1
            char_offset += len(chunk_to_emit)
            overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else ""
            current_chunk = overlap_text + "\n" + para
            current_len = len(current_chunk)
        else:
            if current_chunk:
                current_chunk += "\n\n" + para
            else:
                current_chunk = para
            current_len += para_len + 2

    if current_chunk.strip():
        chunk_to_emit = current_chunk.strip()
        meta = {
            "chunk": chunk_index,
            "char_start": char_offset,
            "page": char_offset // _CHARS_PER_PAGE + 1,
        }
        yield chunk_to_emit, meta