-- Qlippy Local Settings Database Schema
-- SQLite database for offline AI assistant configuration

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- =============================================================================
-- CORE SETTINGS TABLES
-- =============================================================================

-- General application settings
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    data_type TEXT NOT NULL CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
    category TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Theme and appearance settings
CREATE TABLE IF NOT EXISTS themes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    is_custom BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT FALSE,
    config JSON, -- CSS variables, color schemes, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- MODEL CONFIGURATION TABLES
-- =============================================================================

-- User-added GGUF models
CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY, -- UUID
    name TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER NOT NULL, -- in bytes
    file_size_display TEXT NOT NULL, -- "4.2 GB"
    model_type TEXT NOT NULL DEFAULT 'GGUF',
    description TEXT,
    architecture TEXT, -- llama, phi, etc.
    quantization TEXT, -- Q4_K_M, Q8_0, etc.
    context_length INTEGER,
    vocab_size INTEGER,
    parameters_count INTEGER,
    is_active BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    supported_features JSON, -- ["chat", "code", "reasoning"]
    model_config JSON, -- Raw model configuration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Model behavior/generation parameters
CREATE TABLE IF NOT EXISTS model_behavior (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id TEXT REFERENCES models(id) ON DELETE CASCADE,
    temperature REAL NOT NULL DEFAULT 0.7 CHECK (temperature >= 0.0 AND temperature <= 2.0),
    top_p REAL NOT NULL DEFAULT 0.9 CHECK (top_p >= 0.0 AND top_p <= 1.0),
    top_k INTEGER NOT NULL DEFAULT 40 CHECK (top_k >= 0 AND top_k <= 100),
    max_tokens INTEGER NOT NULL DEFAULT 512 CHECK (max_tokens >= 1 AND max_tokens <= 8192),
    stop_sequences JSON, -- ["</s>", "\n\n"]
    system_prompt TEXT DEFAULT '',
    context_window INTEGER DEFAULT 2048,
    repeat_penalty REAL DEFAULT 1.1,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- AUDIO CONFIGURATION TABLES
-- =============================================================================

-- Text-to-speech settings
CREATE TABLE IF NOT EXISTS tts_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    selected_voice TEXT NOT NULL DEFAULT 'en-US-neural-aria',
    playback_speed REAL NOT NULL DEFAULT 1.0 CHECK (playback_speed >= 0.5 AND playback_speed <= 2.0),
    volume REAL NOT NULL DEFAULT 1.0 CHECK (volume >= 0.0 AND volume <= 1.0),
    pitch REAL NOT NULL DEFAULT 1.0 CHECK (pitch >= 0.5 AND pitch <= 2.0),
    test_text TEXT DEFAULT 'Hello! This is a test of the text-to-speech system. How does this sound to you?',
    engine TEXT DEFAULT 'pyttsx3',
    voice_config JSON, -- Additional voice-specific settings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Available TTS voices
CREATE TABLE IF NOT EXISTS tts_voices (
    id TEXT PRIMARY KEY, -- "en-US-neural-aria"
    name TEXT NOT NULL, -- "Aria"
    language TEXT NOT NULL, -- "English (US)"
    language_code TEXT NOT NULL, -- "en-US"
    gender TEXT CHECK (gender IN ('male', 'female', 'neutral')),
    accent TEXT, -- "British", "Australian"
    is_neural BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audio device settings
CREATE TABLE IF NOT EXISTS audio_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_type TEXT NOT NULL CHECK (device_type IN ('input', 'output')),
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_selected BOOLEAN DEFAULT FALSE,
    volume_level REAL DEFAULT 0.75 CHECK (volume_level >= 0.0 AND volume_level <= 1.0),
    auto_adjust BOOLEAN DEFAULT FALSE,
    separate_ringtone BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Voice detection and wake word settings
CREATE TABLE IF NOT EXISTS voice_detection (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wake_word_name TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE, -- Path to .ppn file
    file_name TEXT NOT NULL, -- "Hey-Qlippy.ppn"
    is_default BOOLEAN DEFAULT FALSE,
    is_enabled BOOLEAN DEFAULT TRUE,
    sensitivity REAL DEFAULT 0.5 CHECK (sensitivity >= 0.0 AND sensitivity <= 1.0),
    access_key TEXT, -- Picovoice access key
    detection_config JSON, -- Additional wake word settings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- TOOL SYSTEM TABLES
-- =============================================================================

-- User-defined Python tools
CREATE TABLE IF NOT EXISTS tools (
    id TEXT PRIMARY KEY, -- UUID
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT NOT NULL,
    script_content TEXT NOT NULL,
    file_path TEXT, -- Optional file path if uploaded
    script_type TEXT NOT NULL CHECK (script_type IN ('inline', 'file')),
    is_enabled BOOLEAN DEFAULT TRUE,
    execution_count INTEGER DEFAULT 0,
    last_executed TIMESTAMP,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    dependencies JSON, -- Required Python packages
    permissions JSON, -- File access, network, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tool execution history
CREATE TABLE IF NOT EXISTS tool_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_id TEXT REFERENCES tools(id) ON DELETE CASCADE,
    conversation_id TEXT,
    execution_status TEXT NOT NULL CHECK (execution_status IN ('success', 'error', 'timeout')),
    input_data JSON,
    output_data JSON,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- RULES AND BEHAVIOR TABLES
-- =============================================================================

-- Custom system prompts and rules
CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY, -- UUID
    description TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('system_prompt', 'behavior_rule', 'content_filter')),
    content TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT TRUE,
    applies_to JSON, -- ["chat", "tools", "search"] - what contexts this rule applies to
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- CONVERSATION AND MEMORY TABLES
-- =============================================================================

-- Conversation/chat history
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY, -- UUID
    title TEXT NOT NULL,
    folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
    model_id TEXT REFERENCES models(id) ON DELETE SET NULL,
    message_count INTEGER DEFAULT 0,
    token_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP
);

-- Individual messages within conversations
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY, -- UUID
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    token_count INTEGER DEFAULT 0,
    model_id TEXT REFERENCES models(id) ON DELETE SET NULL,
    tool_calls JSON, -- Array of tool calls made during this message
    metadata JSON, -- Additional message metadata
    is_streaming BOOLEAN DEFAULT FALSE,
    is_speaking BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation folders/organization
CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY, -- UUID
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📁',
    color TEXT DEFAULT '#6B7280',
    parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Memory cache for conversation context
CREATE TABLE IF NOT EXISTS memory_cache (
    id TEXT PRIMARY KEY, -- UUID
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    memory_type TEXT NOT NULL CHECK (memory_type IN ('short_term', 'long_term', 'semantic')),
    content TEXT NOT NULL,
    embedding BLOB, -- Vector embedding for semantic search
    relevance_score REAL DEFAULT 0.0,
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- PRIVACY AND NOTIFICATION TABLES
-- =============================================================================

-- Privacy settings
CREATE TABLE IF NOT EXISTS privacy_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_name TEXT NOT NULL UNIQUE,
    setting_value BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    category TEXT NOT NULL, -- "Analytics", "Data", "Security", "Account"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification settings
CREATE TABLE IF NOT EXISTS notification_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notification_type TEXT NOT NULL UNIQUE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- FILE MANAGEMENT TABLES
-- =============================================================================

-- Uploaded files and documents
CREATE TABLE IF NOT EXISTS uploaded_files (
    id TEXT PRIMARY KEY, -- UUID
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('image', 'document', 'video', 'audio', 'other')),
    checksum TEXT NOT NULL,
    conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
    is_indexed BOOLEAN DEFAULT FALSE,
    index_content TEXT, -- Extracted text content for search
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Settings indexes
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);

-- Model indexes
CREATE INDEX IF NOT EXISTS idx_models_active ON models(is_active);
CREATE INDEX IF NOT EXISTS idx_models_type ON models(model_type);
CREATE INDEX IF NOT EXISTS idx_model_behavior_model_id ON model_behavior(model_id);
CREATE INDEX IF NOT EXISTS idx_model_behavior_active ON model_behavior(is_active);

-- Audio indexes
CREATE INDEX IF NOT EXISTS idx_audio_devices_type ON audio_devices(device_type);
CREATE INDEX IF NOT EXISTS idx_audio_devices_selected ON audio_devices(is_selected);
CREATE INDEX IF NOT EXISTS idx_voice_detection_default ON voice_detection(is_default);

-- Tool indexes
CREATE INDEX IF NOT EXISTS idx_tools_enabled ON tools(is_enabled);
CREATE INDEX IF NOT EXISTS idx_tools_name ON tools(name);
CREATE INDEX IF NOT EXISTS idx_tool_executions_tool_id ON tool_executions(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_executions_conversation_id ON tool_executions(conversation_id);

-- Rule indexes
CREATE INDEX IF NOT EXISTS idx_rules_enabled ON rules(is_enabled);
CREATE INDEX IF NOT EXISTS idx_rules_type ON rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_rules_priority ON rules(priority);

-- Conversation indexes
CREATE INDEX IF NOT EXISTS idx_conversations_folder_id ON conversations(folder_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);
CREATE INDEX IF NOT EXISTS idx_conversations_pinned ON conversations(is_pinned);
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(is_archived);

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Memory indexes
CREATE INDEX IF NOT EXISTS idx_memory_conversation_id ON memory_cache(conversation_id);
CREATE INDEX IF NOT EXISTS idx_memory_type ON memory_cache(memory_type);
CREATE INDEX IF NOT EXISTS idx_memory_relevance_score ON memory_cache(relevance_score);

-- File indexes
CREATE INDEX IF NOT EXISTS idx_uploaded_files_conversation_id ON uploaded_files(conversation_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_type ON uploaded_files(file_type);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_indexed ON uploaded_files(is_indexed);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Update timestamps on settings change
CREATE TRIGGER IF NOT EXISTS update_settings_timestamp
    AFTER UPDATE ON settings
    FOR EACH ROW
BEGIN
    UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update timestamps on conversation change
CREATE TRIGGER IF NOT EXISTS update_conversations_timestamp
    AFTER UPDATE ON conversations
    FOR EACH ROW
BEGIN
    UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update conversation message count and last message time
CREATE TRIGGER IF NOT EXISTS update_conversation_on_message_insert
    AFTER INSERT ON messages
    FOR EACH ROW
BEGIN
    UPDATE conversations 
    SET message_count = message_count + 1,
        last_message_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversation_id;
END;

-- Update conversation message count on message delete
CREATE TRIGGER IF NOT EXISTS update_conversation_on_message_delete
    AFTER DELETE ON messages
    FOR EACH ROW
BEGIN
    UPDATE conversations 
    SET message_count = message_count - 1
    WHERE id = OLD.conversation_id;
END;

-- Update tool execution count
CREATE TRIGGER IF NOT EXISTS update_tool_execution_count
    AFTER INSERT ON tool_executions
    FOR EACH ROW
BEGIN
    UPDATE tools 
    SET execution_count = execution_count + 1,
        last_executed = CURRENT_TIMESTAMP
    WHERE id = NEW.tool_id;
END;

-- Update memory cache access count
CREATE TRIGGER IF NOT EXISTS update_memory_access_count
    AFTER UPDATE ON memory_cache
    FOR EACH ROW
    WHEN NEW.access_count > OLD.access_count
BEGIN
    UPDATE memory_cache 
    SET last_accessed = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- =============================================================================
-- DEFAULT DATA INSERTION
-- =============================================================================

-- Insert default themes
INSERT OR IGNORE INTO themes (name, display_name, description, is_custom, is_active) VALUES
('light', 'Light', 'Clean and bright', FALSE, TRUE),
('dark', 'Dark', 'Easy on the eyes', FALSE, FALSE),
('system', 'System', 'Follow system preference', FALSE, FALSE),
('pastels', 'Pastels', 'Soft and colorful', TRUE, FALSE),
('cute', 'Cute', 'Adorable and warm', TRUE, FALSE),
('magic', 'Magic', 'Mystical and enchanting', TRUE, FALSE),
('starry', 'Starry', 'Deep space theme', TRUE, FALSE);

-- Insert default TTS voices
INSERT OR IGNORE INTO tts_voices (id, name, language, language_code, gender, accent, is_neural, quality_rating) VALUES
('en-US-neural-aria', 'Aria', 'English (US)', 'en-US', 'female', NULL, TRUE, 5),
('en-US-neural-davis', 'Davis', 'English (US)', 'en-US', 'male', NULL, TRUE, 5),
('en-US-neural-jenny', 'Jenny', 'English (US)', 'en-US', 'female', NULL, TRUE, 5),
('en-US-neural-guy', 'Guy', 'English (US)', 'en-US', 'male', NULL, TRUE, 5),
('en-GB-neural-libby', 'Libby', 'English (UK)', 'en-GB', 'female', 'British', TRUE, 5),
('en-GB-neural-ryan', 'Ryan', 'English (UK)', 'en-GB', 'male', 'British', TRUE, 5),
('en-AU-neural-natasha', 'Natasha', 'English (AU)', 'en-AU', 'female', 'Australian', TRUE, 5),
('en-AU-neural-william', 'William', 'English (AU)', 'en-AU', 'male', 'Australian', TRUE, 5),
('fr-FR-neural-denise', 'Denise', 'French (FR)', 'fr-FR', 'female', NULL, TRUE, 4),
('fr-FR-neural-henri', 'Henri', 'French (FR)', 'fr-FR', 'male', NULL, TRUE, 4),
('de-DE-neural-katja', 'Katja', 'German (DE)', 'de-DE', 'female', NULL, TRUE, 4),
('de-DE-neural-conrad', 'Conrad', 'German (DE)', 'de-DE', 'male', NULL, TRUE, 4),
('es-ES-neural-elvira', 'Elvira', 'Spanish (ES)', 'es-ES', 'female', NULL, TRUE, 4),
('es-ES-neural-alvaro', 'Alvaro', 'Spanish (ES)', 'es-ES', 'male', NULL, TRUE, 4);

-- Insert default TTS settings
INSERT OR IGNORE INTO tts_settings (id, selected_voice, playback_speed, volume, pitch, test_text) VALUES
(1, 'en-US-neural-aria', 1.0, 1.0, 1.0, 'Hello! This is a test of the text-to-speech system. How does this sound to you?');

-- Insert default wake word
INSERT OR IGNORE INTO voice_detection (id, wake_word_name, file_path, file_name, is_default, is_enabled) VALUES
(1, 'Hey Qlippy', 'assets/wake-words/Hey-Qlippy.ppn', 'Hey-Qlippy.ppn', TRUE, TRUE);

-- Insert default rules
INSERT OR IGNORE INTO rules (id, description, rule_type, content, priority, is_enabled) VALUES
('rule-1', 'Always check for proper error handling, type safety, and documentation when reviewing code', 'behavior_rule', 'When reviewing or writing code, always prioritize error handling, type safety, and comprehensive documentation.', 1, TRUE),
('rule-2', 'Use clear headings, bullet points, and code blocks for technical content in responses', 'behavior_rule', 'Format technical responses with clear headings, bullet points, and properly formatted code blocks for better readability.', 2, TRUE),
('rule-3', 'Break down complex tasks into smaller, manageable steps with clear dependencies', 'behavior_rule', 'When handling complex tasks, break them down into smaller, manageable steps and clearly identify dependencies between steps.', 3, TRUE);

-- Insert default privacy settings
INSERT OR IGNORE INTO privacy_settings (setting_name, setting_value, description, category) VALUES
('data_collection', TRUE, 'Allow Qlippy to collect usage data for improvements', 'Analytics'),
('auto_save', TRUE, 'Automatically save your conversations and settings', 'Data'),
('privacy_mode', FALSE, 'Enhanced privacy with limited data sharing', 'Security'),
('export_data', TRUE, 'Download your data and conversations', 'Data'),
('delete_data', FALSE, 'Permanently delete your account and data', 'Account');

-- Insert default notification settings
INSERT OR IGNORE INTO notification_settings (notification_type, is_enabled, description, icon) VALUES
('chat_messages', TRUE, 'Get notified when you receive new messages', 'MessageSquare'),
('ai_responses', TRUE, 'Notifications for AI assistant responses', 'Sparkles'),
('system_updates', FALSE, 'Important system and security updates', 'Zap'),
('reminders', TRUE, 'Daily reminders and scheduled notifications', 'Bell');

-- Insert default general settings
INSERT OR IGNORE INTO settings (key, value, data_type, category, description) VALUES
('theme', 'light', 'string', 'appearance', 'Current active theme'),
('language', 'en-US', 'string', 'general', 'Application language'),
('auto_start', 'false', 'boolean', 'general', 'Start application on system startup'),
('minimize_to_tray', 'true', 'boolean', 'general', 'Minimize to system tray'),
('show_tray_icon', 'true', 'boolean', 'general', 'Show system tray icon'),
('check_updates', 'true', 'boolean', 'general', 'Check for updates automatically'),
('analytics_enabled', 'true', 'boolean', 'privacy', 'Enable usage analytics'),
('crash_reporting', 'true', 'boolean', 'privacy', 'Enable crash reporting'); 