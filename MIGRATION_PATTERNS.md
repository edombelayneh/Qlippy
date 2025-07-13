# Qlippy Database Migration and Syncing Patterns

## Overview
This document outlines the migration and syncing patterns for the Qlippy local database when users update their local models, wakeword files, or other assets.

## Key Principles

1. **Offline-First**: All operations work without internet connectivity
2. **File-System Sync**: Database stays in sync with actual files on disk
3. **Incremental Updates**: Only process changes, not full scans
4. **Graceful Degradation**: Handle missing files without breaking the app
5. **User Control**: Users can manually trigger sync operations

## Migration Patterns

### 1. Model File Management

#### Adding New Models
```sql
-- Detect new GGUF files in model directory
INSERT OR IGNORE INTO models (
    id, name, file_path, file_size, file_size_display, 
    model_type, architecture, quantization, created_at
) VALUES (
    ?, ?, ?, ?, ?, 'GGUF', ?, ?, CURRENT_TIMESTAMP
);
```

#### Model File Validation
```python
def validate_model_file(file_path: str) -> dict:
    """Validate and extract metadata from GGUF model file"""
    try:
        # Check file exists and is readable
        if not os.path.exists(file_path):
            return {"valid": False, "error": "File not found"}
        
        # Extract GGUF metadata
        metadata = extract_gguf_metadata(file_path)
        
        # Validate model architecture
        if not metadata.get("architecture"):
            return {"valid": False, "error": "Unknown architecture"}
        
        return {
            "valid": True,
            "metadata": metadata,
            "size": os.path.getsize(file_path),
            "checksum": calculate_file_checksum(file_path)
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}
```

#### Orphaned Model Cleanup
```sql
-- Remove database entries for deleted model files
DELETE FROM models 
WHERE NOT EXISTS (
    SELECT 1 FROM filesystem_check 
    WHERE filesystem_check.path = models.file_path
);

-- Update model status when file is temporarily unavailable
UPDATE models 
SET is_active = FALSE 
WHERE file_path NOT IN (SELECT path FROM filesystem_check);
```

### 2. Wake Word File Management

#### Adding New Wake Words
```sql
-- Add new wake word files (.ppn)
INSERT OR IGNORE INTO voice_detection (
    id, wake_word_name, file_path, file_name, 
    is_default, is_enabled, created_at
) SELECT 
    lower(hex(randomblob(16))), -- Generate UUID
    ?, ?, ?, 
    FALSE, TRUE, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM voice_detection WHERE file_path = ?
);
```

#### Wake Word File Validation
```python
def validate_wake_word_file(file_path: str) -> dict:
    """Validate .ppn wake word file"""
    try:
        if not file_path.endswith('.ppn'):
            return {"valid": False, "error": "Invalid file extension"}
        
        if not os.path.exists(file_path):
            return {"valid": False, "error": "File not found"}
        
        # Basic file size check (ppn files are typically 2-50KB)
        size = os.path.getsize(file_path)
        if size < 1024 or size > 102400:  # 1KB to 100KB
            return {"valid": False, "error": "Invalid file size"}
        
        return {
            "valid": True,
            "size": size,
            "name": os.path.basename(file_path).replace('.ppn', '')
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}
```

### 3. File System Synchronization

#### Directory Watchers
```python
class FileSystemWatcher:
    def __init__(self, db_connection, watch_paths):
        self.db = db_connection
        self.watch_paths = watch_paths
        self.observer = Observer()
    
    def on_file_created(self, file_path):
        """Handle new file creation"""
        if file_path.endswith('.gguf'):
            self.sync_model_file(file_path)
        elif file_path.endswith('.ppn'):
            self.sync_wake_word_file(file_path)
    
    def on_file_deleted(self, file_path):
        """Handle file deletion"""
        # Mark as unavailable instead of deleting
        self.db.execute("""
            UPDATE models SET is_active = FALSE 
            WHERE file_path = ?
        """, (file_path,))
    
    def on_file_modified(self, file_path):
        """Handle file modification"""
        # Re-validate and update metadata
        if file_path.endswith('.gguf'):
            self.update_model_metadata(file_path)
```

#### Periodic Sync Jobs
```python
class SyncManager:
    def __init__(self, db_connection):
        self.db = db_connection
    
    async def sync_models_directory(self, models_dir: str):
        """Sync models directory with database"""
        # Get all GGUF files
        gguf_files = []
        for root, dirs, files in os.walk(models_dir):
            for file in files:
                if file.endswith('.gguf'):
                    gguf_files.append(os.path.join(root, file))
        
        # Get existing models from database
        existing_models = self.db.execute("""
            SELECT file_path, file_size, updated_at 
            FROM models
        """).fetchall()
        
        existing_paths = {m[0] for m in existing_models}
        
        # Add new models
        for file_path in gguf_files:
            if file_path not in existing_paths:
                await self.add_model_file(file_path)
        
        # Mark missing models as inactive
        for db_path in existing_paths:
            if db_path not in gguf_files:
                self.db.execute("""
                    UPDATE models SET is_active = FALSE 
                    WHERE file_path = ?
                """, (db_path,))
    
    async def add_model_file(self, file_path: str):
        """Add a new model file to database"""
        validation = validate_model_file(file_path)
        
        if not validation["valid"]:
            logger.error(f"Invalid model file {file_path}: {validation['error']}")
            return
        
        metadata = validation["metadata"]
        size = validation["size"]
        
        model_id = str(uuid.uuid4())
        
        self.db.execute("""
            INSERT INTO models (
                id, name, file_path, file_size, file_size_display,
                model_type, architecture, quantization, 
                context_length, vocab_size, parameters_count,
                is_active, model_config, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            model_id,
            metadata.get("name", os.path.basename(file_path)),
            file_path,
            size,
            self.format_file_size(size),
            "GGUF",
            metadata.get("architecture"),
            metadata.get("quantization"),
            metadata.get("context_length"),
            metadata.get("vocab_size"),
            metadata.get("parameters_count"),
            True,
            json.dumps(metadata),
            datetime.now()
        ))
        
        # Create default behavior settings
        self.db.execute("""
            INSERT INTO model_behavior (
                model_id, temperature, top_p, top_k, 
                max_tokens, system_prompt, is_active
            ) VALUES (?, 0.7, 0.9, 40, 1024, '', ?)
        """, (model_id, len(self.get_active_models()) == 0))
```

### 4. Database Migration Scripts

#### Version 1.0 to 1.1 Migration
```sql
-- Add new columns for enhanced model metadata
ALTER TABLE models ADD COLUMN checksum TEXT;
ALTER TABLE models ADD COLUMN last_validated TIMESTAMP;
ALTER TABLE models ADD COLUMN validation_status TEXT DEFAULT 'pending';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_models_checksum ON models(checksum);
CREATE INDEX IF NOT EXISTS idx_models_validation_status ON models(validation_status);

-- Update schema version
INSERT OR REPLACE INTO settings (key, value, data_type, category) 
VALUES ('schema_version', '1.1', 'string', 'system');
```

#### Migration Runner
```python
class MigrationRunner:
    def __init__(self, db_connection):
        self.db = db_connection
        self.migrations = {
            "1.0": self.migrate_to_1_1,
            "1.1": self.migrate_to_1_2,
            # Add more migrations as needed
        }
    
    def get_current_version(self):
        """Get current schema version"""
        result = self.db.execute("""
            SELECT value FROM settings 
            WHERE key = 'schema_version'
        """).fetchone()
        return result[0] if result else "1.0"
    
    def run_migrations(self):
        """Run all pending migrations"""
        current_version = self.get_current_version()
        
        for version, migration_func in self.migrations.items():
            if self.version_greater_than(version, current_version):
                logger.info(f"Running migration to version {version}")
                migration_func()
                self.update_schema_version(version)
    
    def migrate_to_1_1(self):
        """Migration to version 1.1"""
        self.db.execute("""
            ALTER TABLE models ADD COLUMN checksum TEXT;
            ALTER TABLE models ADD COLUMN last_validated TIMESTAMP;
            ALTER TABLE models ADD COLUMN validation_status TEXT DEFAULT 'pending';
        """)
        
        self.db.execute("""
            CREATE INDEX IF NOT EXISTS idx_models_checksum ON models(checksum);
            CREATE INDEX IF NOT EXISTS idx_models_validation_status ON models(validation_status);
        """)
```

### 5. Conflict Resolution

#### Duplicate Model Names
```python
def resolve_duplicate_model_names(db_connection):
    """Resolve duplicate model names by appending numbers"""
    duplicates = db_connection.execute("""
        SELECT name, COUNT(*) as count 
        FROM models 
        GROUP BY name 
        HAVING COUNT(*) > 1
    """).fetchall()
    
    for name, count in duplicates:
        models = db_connection.execute("""
            SELECT id, file_path FROM models 
            WHERE name = ? ORDER BY created_at
        """, (name,)).fetchall()
        
        # Keep first one, rename others
        for i, (model_id, file_path) in enumerate(models[1:], 2):
            new_name = f"{name} ({i})"
            db_connection.execute("""
                UPDATE models SET name = ? WHERE id = ?
            """, (new_name, model_id))
```

#### File Path Conflicts
```python
def resolve_file_path_conflicts(db_connection):
    """Handle cases where multiple DB entries point to same file"""
    conflicts = db_connection.execute("""
        SELECT file_path, COUNT(*) as count 
        FROM models 
        GROUP BY file_path 
        HAVING COUNT(*) > 1
    """).fetchall()
    
    for file_path, count in conflicts:
        entries = db_connection.execute("""
            SELECT id, created_at FROM models 
            WHERE file_path = ? ORDER BY created_at
        """, (file_path,)).fetchall()
        
        # Keep newest entry, remove others
        for entry_id, _ in entries[:-1]:
            db_connection.execute("""
                DELETE FROM models WHERE id = ?
            """, (entry_id,))
```

### 6. Sync Status and User Interface

#### Sync Status Tracking
```sql
-- Track sync operations
CREATE TABLE IF NOT EXISTS sync_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_type TEXT NOT NULL, -- 'model_sync', 'wake_word_sync', etc.
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    progress_percent INTEGER DEFAULT 0,
    message TEXT,
    files_processed INTEGER DEFAULT 0,
    files_total INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_details TEXT
);
```

#### User Interface for Sync Operations
```python
class SyncUI:
    def __init__(self, sync_manager):
        self.sync_manager = sync_manager
    
    async def trigger_manual_sync(self, sync_type: str):
        """Trigger manual sync operation"""
        sync_id = self.create_sync_record(sync_type)
        
        try:
            if sync_type == "models":
                await self.sync_manager.sync_models_directory()
            elif sync_type == "wake_words":
                await self.sync_manager.sync_wake_words_directory()
            
            self.update_sync_status(sync_id, "completed")
            
        except Exception as e:
            self.update_sync_status(sync_id, "failed", str(e))
            raise
    
    def get_sync_progress(self, sync_id: int):
        """Get sync progress for UI display"""
        return self.db.execute("""
            SELECT status, progress_percent, message, 
                   files_processed, files_total
            FROM sync_status WHERE id = ?
        """, (sync_id,)).fetchone()
```

### 7. Backup and Recovery

#### Database Backup
```python
def create_backup(db_path: str, backup_dir: str):
    """Create database backup before major operations"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(backup_dir, f"qlippy_backup_{timestamp}.db")
    
    # Use SQLite backup API
    source = sqlite3.connect(db_path)
    backup = sqlite3.connect(backup_path)
    
    source.backup(backup)
    
    source.close()
    backup.close()
    
    return backup_path
```

#### Recovery Procedures
```python
def recover_from_backup(backup_path: str, current_db_path: str):
    """Recover database from backup"""
    if not os.path.exists(backup_path):
        raise FileNotFoundError(f"Backup file not found: {backup_path}")
    
    # Backup current database
    if os.path.exists(current_db_path):
        shutil.copy2(current_db_path, f"{current_db_path}.recovery_backup")
    
    # Restore from backup
    shutil.copy2(backup_path, current_db_path)
    
    # Verify integrity
    db = sqlite3.connect(current_db_path)
    result = db.execute("PRAGMA integrity_check").fetchone()
    db.close()
    
    if result[0] != "ok":
        raise Exception(f"Database integrity check failed: {result[0]}")
```

## Implementation Recommendations

1. **Start with File Watchers**: Implement directory watchers for real-time sync
2. **Periodic Sync Jobs**: Run full sync operations every 15-30 minutes
3. **User-Initiated Sync**: Provide manual sync buttons in settings
4. **Progress Indicators**: Show sync progress to users
5. **Error Handling**: Graceful handling of file access errors
6. **Backup Strategy**: Automatic backups before major operations
7. **Validation**: Always validate files before database insertion
8. **Logging**: Comprehensive logging for debugging sync issues

## Testing Strategy

1. **Unit Tests**: Test individual sync functions
2. **Integration Tests**: Test full sync workflows
3. **Edge Cases**: Test with corrupted files, permission issues
4. **Performance Tests**: Test with large numbers of files
5. **Recovery Tests**: Test backup/restore procedures 