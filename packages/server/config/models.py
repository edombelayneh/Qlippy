from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class SpeakRequest(BaseModel):
    text: str
    stop: bool = False

class GenerateRequest(BaseModel):
    prompt: str

class AudioMetrics(BaseModel):
    max_amplitude: int
    mean_amplitude: int
    duration: float

class WebSocketMessage(BaseModel):
    status: str
    message: str
    transcription: Optional[str] = None
    metrics: Optional[AudioMetrics] = None
    error: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    services: Dict[str, str]

# =============================================================================
# SETTINGS API MODELS
# =============================================================================

class ThemeSettings(BaseModel):
    theme: str

class TTSSettings(BaseModel):
    selectedVoice: str
    playbackSpeed: float
    testText: str

class ModelBehaviorSettings(BaseModel):
    temperature: float
    top_p: float
    top_k: int
    max_tokens: int
    stop_sequences: List[str]
    system_prompt: str

class VoiceDetectionSettings(BaseModel):
    wake_word: Optional[str]
    file_path: Optional[str]
    enabled: bool

class AudioSettings(BaseModel):
    speaker_volume: float
    mic_volume: float
    selected_speaker: Optional[str] = None
    selected_microphone: Optional[str] = None

class ModelRequest(BaseModel):
    name: str
    file_path: str
    file_size_display: str

class RuleRequest(BaseModel):
    description: str

class ConversationRequest(BaseModel):
    title: str

class ConversationTitleUpdateRequest(BaseModel):
    title: str

class MessageRequest(BaseModel):
    role: str
    content: str

class SettingsResponse(BaseModel):
    status: str
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

# =============================================================================
# RAG API MODELS
# =============================================================================

class RAGSettings(BaseModel):
    chunk_size: int = 1000
    chunk_overlap: int = 200
    embedding_model: str = "all-MiniLM-L6-v2"
    top_k_results: int = 5
    min_relevance_score: float = 0.3

class IndexedDirectory(BaseModel):
    id: Optional[str] = None
    path: str
    is_active: bool = True
    file_patterns: List[str] = ["*.txt", "*.md", "*.py", "*.js", "*.json", "*.yaml", "*.yml", "*.csv", "*.log"]
    exclude_patterns: List[str] = ["node_modules", ".git", "__pycache__", "*.pyc", ".env", "venv", "build", "dist"]
    index_frequency_minutes: int = 60

class FileIndexStatus(BaseModel):
    file_path: str
    status: str  # "indexed", "changed", "new", "deleted"
    file_size: int
    last_modified: str
    chunk_count: int = 0

class IndexingProgress(BaseModel):
    directory_id: str
    total_files: int
    processed_files: int
    status: str  # "scanning", "indexing", "complete", "error"
    current_file: Optional[str] = None
    errors: List[str] = []

class RAGQuery(BaseModel):
    query: str
    conversation_id: str
    directory_ids: Optional[List[str]] = None
    top_k: Optional[int] = None
    min_score: Optional[float] = None

class RAGChunk(BaseModel):
    content: str
    file_path: str
    chunk_index: int
    relevance_score: float
    metadata: Dict[str, Any] = {}

class RAGResponse(BaseModel):
    chunks: List[RAGChunk]
    query: str
    total_chunks_searched: int

class DirectoryRAGContext(BaseModel):
    conversation_id: str
    directory_id: str
    is_active: bool = True