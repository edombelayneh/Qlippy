-- RAG (Retrieval Augmented Generation) Schema Updates for Qlippy
-- Add these tables to support offline file indexing and embedding

-- =============================================================================
-- RAG CONFIGURATION
-- =============================================================================

-- RAG-specific settings
CREATE TABLE IF NOT EXISTS rag_settings (
    id INTEGER PRIMARY KEY,
    chunk_size INTEGER DEFAULT 1000,           -- Characters per chunk
    chunk_overlap INTEGER DEFAULT 200,         -- Overlap between chunks
    embedding_model TEXT DEFAULT 'all-MiniLM-L6-v2',  -- Local sentence-transformers model
    top_k_results INTEGER DEFAULT 5,           -- Number of chunks to retrieve
    min_relevance_score REAL DEFAULT 0.3,      -- Minimum similarity score
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- FILE INDEXING
-- =============================================================================

-- Directories being indexed
CREATE TABLE IF NOT EXISTS indexed_directories (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    last_indexed_at TIMESTAMP,
    index_frequency_minutes INTEGER DEFAULT 60,  -- How often to check for changes
    file_patterns TEXT DEFAULT '["*.txt", "*.md", "*.py", "*.js", "*.json", "*.yaml", "*.yml", "*.csv", "*.log"]',  -- JSON array
    exclude_patterns TEXT DEFAULT '["node_modules", ".git", "__pycache__", "*.pyc", ".env", "venv", "build", "dist"]',  -- JSON array
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- File index with Merkle tree hashes
CREATE TABLE IF NOT EXISTS file_index (
    id TEXT PRIMARY KEY,
    directory_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_hash TEXT NOT NULL,        -- SHA256 hash of file content
    merkle_hash TEXT NOT NULL,      -- Hash including path + content
    file_size INTEGER NOT NULL,
    last_modified TIMESTAMP NOT NULL,
    is_indexed BOOLEAN DEFAULT FALSE,
    indexed_at TIMESTAMP,
    chunk_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (directory_id) REFERENCES indexed_directories(id) ON DELETE CASCADE,
    UNIQUE(directory_id, file_path)
);

-- Merkle tree nodes for efficient change detection
CREATE TABLE IF NOT EXISTS merkle_tree (
    id TEXT PRIMARY KEY,
    directory_id TEXT NOT NULL,
    node_path TEXT NOT NULL,        -- Path in tree (e.g., "root/folder1")
    node_hash TEXT NOT NULL,        -- Hash of children hashes
    is_leaf BOOLEAN DEFAULT FALSE,
    parent_path TEXT,
    level INTEGER NOT NULL,         -- Tree depth (0 = root)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (directory_id) REFERENCES indexed_directories(id) ON DELETE CASCADE,
    UNIQUE(directory_id, node_path)
);

-- =============================================================================
-- EMBEDDINGS METADATA
-- =============================================================================

-- Track embedding metadata (actual vectors stored in Chroma)
CREATE TABLE IF NOT EXISTS embedding_metadata (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    start_char INTEGER NOT NULL,
    end_char INTEGER NOT NULL,
    chunk_hash TEXT NOT NULL,       -- Hash of chunk content
    embedding_id TEXT NOT NULL,     -- ID in vector store
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES file_index(id) ON DELETE CASCADE,
    UNIQUE(file_id, chunk_index)
);

-- =============================================================================
-- CONVERSATION RAG CONTEXT
-- =============================================================================

-- Link conversations to specific directories for context
CREATE TABLE IF NOT EXISTS conversation_rag_context (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    directory_id TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (directory_id) REFERENCES indexed_directories(id) ON DELETE CASCADE,
    UNIQUE(conversation_id, directory_id)
);

-- Cache of retrieved chunks per message (for context continuity)
CREATE TABLE IF NOT EXISTS message_rag_chunks (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    embedding_id TEXT NOT NULL,
    relevance_score REAL NOT NULL,
    chunk_order INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_file_index_directory_id ON file_index(directory_id);
CREATE INDEX IF NOT EXISTS idx_file_index_file_hash ON file_index(file_hash);
CREATE INDEX IF NOT EXISTS idx_merkle_tree_directory_id ON merkle_tree(directory_id);
CREATE INDEX IF NOT EXISTS idx_merkle_tree_parent_path ON merkle_tree(parent_path);
CREATE INDEX IF NOT EXISTS idx_embedding_metadata_file_id ON embedding_metadata(file_id);
CREATE INDEX IF NOT EXISTS idx_conversation_rag_context_conversation_id ON conversation_rag_context(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_rag_chunks_message_id ON message_rag_chunks(message_id);

-- =============================================================================
-- DEFAULT DATA
-- =============================================================================

-- Default RAG settings
INSERT INTO rag_settings (id, chunk_size, chunk_overlap, embedding_model, top_k_results, min_relevance_score) 
VALUES (1, 1000, 200, 'all-MiniLM-L6-v2', 5, 0.3); 