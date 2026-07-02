import re
from typing import Generator
from app.config import settings
def chunk_text(text: str, chunk_size: int = None, overlap: int = None) -> Generator[tuple[str,dict],None,None]:
    chunk_size= chunk_size or settings.chunk_size
    overlap = overlap or settings.chunk_overlap
    paragraphs = re.split(r"\n\s*\n",text)
    current_chunk= ""
    current_len = 0
    chunk_index = 0
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        para_len = len(para)

        if current_len + para_len > chunk_size and current_chunk:
            meta = {"chunk": chunk_index, "char_start": chunk_index * chunk_size}
            yield current_chunk.strip(), meta
            chunk_index += 1
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
        meta = {"chunk": chunk_index, "char_start": chunk_index * chunk_size}
        yield current_chunk.strip(), meta