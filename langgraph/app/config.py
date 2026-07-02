from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    agent_port: int = 8000
    agent_host: str = "0.0.0.0"
    ollama_base_url: str = "http://localhost:11434"
    llm_model: str = "qwen3:8b"
    embedding_model: str = "nomic-embed-text"
    chroma_persist_dir: str = "./data/chroma"
    chroma_collection: str = "venorse_docs"
    express_base_url: str = "http://localhost:3000"
    log_level: str = "INFO"
    chunk_size: int = 1500
    chunk_overlap: int = 200
    groq_api_key: str = ""
    groq_llm_model: str = "llama-3.1-8b-instant"
    gemini_api_key: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()