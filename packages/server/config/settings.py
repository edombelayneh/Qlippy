import os
from pathlib import Path

class Settings:
    # API Settings
    HOST: str = "127.0.0.1"
    PORT: int = 11434
    CORS_ORIGINS: list = ["http://localhost:3000"]
    
    # Model Paths
    BASE_DIR = Path(__file__).parent.parent
    WHISPER_MODEL_PATH = BASE_DIR / "models" / "whisper-base"
    LLM_MODEL_PATH = BASE_DIR / "llm" / "phi-2.Q4_K_M.gguf"
    
    # Audio Settings
    SAMPLE_RATE: int = 16000
    CHANNELS: int = 1
    AUDIO_FORMAT: str = "pcm_s16le"
    MIN_AMPLITUDE: int = 5  # Lowered from 10 to be even more sensitive
    
    # LLM Settings
    MAX_TOKENS: int = 512
    TEMPERATURE: float = 0.7
    CONTEXT_WINDOW: int = 2048
    
    # TTS Settings
    TTS_VOLUME: float = 2.0

settings = Settings()