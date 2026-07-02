import json
import logging
import re
from pathlib import Path
from typing import Optional

from rank_bm25 import BM25Okapi

from app.config import settings

logger = logging.getLogger(__name__)

DATA_DIR = Path(settings.chroma_persist_dir)
CHUNKS_FILE = DATA_DIR / "chunks.json"


def _tokenize(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())


class BM25VectorStore:
    def __init__(self):
        self.chunks: list[dict] = []
        self.bm25: Optional[BM25Okapi] = None
        self._load()

    # ── persistence ──────────────────────────────────────────
    def _load(self):
        if CHUNKS_FILE.exists():
            try:
                with open(CHUNKS_FILE) as f:
                    self.chunks = json.load(f)
                self._rebuild()
                logger.info("Loaded %d chunks from disk", len(self.chunks))
            except Exception as e:
                logger.warning("Failed to load chunks file: %s", e)
                self.chunks = []

    def _save(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(CHUNKS_FILE, "w") as f:
            json.dump(self.chunks, f)

    def _rebuild(self):
        if self.chunks:
            tokenized = [_tokenize(c["content"]) for c in self.chunks]
            self.bm25 = BM25Okapi(tokenized)
        else:
            self.bm25 = None

    # ── public API ───────────────────────────────────────────
    def add(self, ids: list[str], documents: list[str], metadatas: list[dict]):
        for i, doc in enumerate(documents):
            self.chunks.append({
                "id": ids[i],
                "content": doc,
                "metadata": metadatas[i] if i < len(metadatas) else {},
            })
        self._rebuild()
        self._save()
        logger.info("Stored %d chunks, total %d", len(documents), len(self.chunks))

    def query(
        self,
        query_texts: list[str],
        n_results: int = 5,
        where: Optional[dict] = None,
    ) -> dict:
        if not self.bm25 or not self.chunks:
            return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}

        # Filter by metadata
        indices = list(range(len(self.chunks)))
        if where:
            indices = [
                i for i in indices
                if all(self.chunks[i]["metadata"].get(k) == v for k, v in where.items())
            ]

        if not indices:
            return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}

        # Score the filtered set
        query_tokens = _tokenize(query_texts[0])
        filtered_tokenized = [_tokenize(self.chunks[i]["content"]) for i in indices]
        filtered_bm25 = BM25Okapi(filtered_tokenized)
        scores = filtered_bm25.get_scores(query_tokens)

        top = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:n_results]

        return {
            "ids": [[self.chunks[indices[i]]["id"] for i in top]],
            "documents": [[self.chunks[indices[i]]["content"] for i in top]],
            "metadatas": [[self.chunks[indices[i]]["metadata"] for i in top]],
            "distances": [[float(scores[i]) for i in top]],
        }

    def get(self, where: dict) -> dict:
        matching = [
            c for c in self.chunks
            if all(c["metadata"].get(k) == v for k, v in where.items())
        ]
        return {
            "ids": [c["id"] for c in matching],
            "documents": [c["content"] for c in matching],
            "metadatas": [c["metadata"] for c in matching],
        }

    def delete(self, ids: list[str]):
        id_set = set(ids)
        self.chunks = [c for c in self.chunks if c["id"] not in id_set]
        self._rebuild()
        self._save()
        logger.info("Deleted %d chunks, remaining %d", len(ids), len(self.chunks))


# Singleton
_store: Optional[BM25VectorStore] = None


def _get_store():
    global _store
    if _store is None:
        _store = BM25VectorStore()
    return _store


# ── convenience wrappers (drop-in replacement for ChromaDB API) ──

def get_chroma_client():
    return None  # compat shim, not used


def get_or_create_collection(client=None):
    return _get_store()


def add_document_chunks(chunks: list[str], metadata: list[dict], doc_id: str):
    store = _get_store()
    ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
    store.add(ids=ids, documents=chunks, metadatas=metadata)


def search(query: str, top_k: int = 5, filters: Optional[dict] = None) -> list[dict]:
    store = _get_store()
    where = filters or {}
    results = store.query(query_texts=[query], n_results=top_k, where=where or None)
    documents = []
    if results["documents"] and results["documents"][0]:
        for i, doc in enumerate(results["documents"][0]):
            documents.append({
                "content": doc,
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                "score": results["distances"][0][i] if results["distances"] else 0,
            })
    return documents


def delete_document_chunks(doc_id: str):
    store = _get_store()
    existing = store.get(where={"doc_id": doc_id})
    if existing["ids"]:
        store.delete(ids=existing["ids"])
