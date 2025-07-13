-- Qlippy MVP Database Schema
-- Optimized for 5-hour rapid development
-- Simple, focused, and easy to integrate

PRAGMA foreign_keys = ON;

-- =============================================================================
-- CORE SETTINGS (Key-Value Store)
-- =============================================================================

-- Simple key-value store for all settings
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- MODELS (Simplified)
-- =============================================================================

-- User models - simplified for MVP
CREATE TABLE models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size_display TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Model behavior settings - single active config
CREATE TABLE model_behavior (
    id INTEGER PRIMARY KEY,
    temperature REAL DEFAULT 0.7,
    top_p REAL DEFAULT 0.9,
    top_k INTEGER DEFAULT 40,
    max_tokens INTEGER DEFAULT 1024,
    stop_sequences TEXT DEFAULT '[]', -- JSON array as text
    system_prompt TEXT DEFAULT '',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- CONVERSATIONS (Essential)
-- =============================================================================

-- Conversations
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- =============================================================================
-- TOOLS (Simplified)
-- =============================================================================

-- Tools - basic structure
CREATE TABLE tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    script_content TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rules - simple list
CREATE TABLE rules (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INDEXES (Essential only)
-- =============================================================================

CREATE INDEX idx_settings_key ON settings(key);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at);
CREATE INDEX idx_models_active ON models(is_active);

-- =============================================================================
-- TRIGGERS (Minimal)
-- =============================================================================

-- Update conversation timestamp on new message
CREATE TRIGGER update_conversation_timestamp
    AFTER INSERT ON messages
    FOR EACH ROW
BEGIN
    UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.conversation_id;
END;

-- Update settings timestamp
CREATE TRIGGER update_settings_timestamp
    AFTER UPDATE ON settings
    FOR EACH ROW
BEGIN
    UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
END;

-- =============================================================================
-- DEFAULT DATA (MVP Essentials)
-- =============================================================================

-- Essential settings matching your frontend
INSERT INTO settings (key, value) VALUES
-- Theme settings
('theme', 'system'),

-- TTS settings
('tts_selected_voice', 'en-US-neural-aria'),
('tts_playback_speed', '1.0'),
('tts_test_text', 'Hello! This is a test of the text-to-speech system. How does this sound to you?'),

-- Audio device volumes (devices themselves are detected, not hardcoded)
('audio_speaker_volume', '0.75'),
('audio_mic_volume', '0.8'),

-- General settings
('auto_start', 'false'),
('minimize_to_tray', 'true'),
('show_tray_icon', 'true');

-- Default model behavior
INSERT INTO model_behavior (id, temperature, top_p, top_k, max_tokens, stop_sequences, system_prompt) VALUES
(1, 0.7, 0.9, 40, 512, '[]', 'You are Qlippy, a helpful AI assistant. Follow these guidelines:

FORMATTING:
- Use markdown for code blocks: ```language
- Keep responses clear and concise
- Use bullet points for lists
- Bold **important** concepts

BEHAVIOR:
- Be direct and informative
- Ask clarifying questions when needed
- Provide working code examples when requested
- Explain complex concepts simply

CONSTRAINTS:
- Keep responses under 800 tokens when possible
- Prioritize accuracy over length
- If a topic is complex, offer to break it into parts');

-- Rules table starts empty - user or system will define rules as needed

-- Conversations table starts empty - users will create conversations as needed 