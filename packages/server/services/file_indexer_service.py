"""
File Indexer Service
Handles file system scanning, Merkle tree computation, and change detection
"""

import os
import hashlib
import json
import sqlite3
import asyncio
import fnmatch
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Set
import uuid
from collections import defaultdict

class FileIndexerService:
    """Service for indexing files and tracking changes using Merkle trees"""
    
    def __init__(self, db_path: str = "qlippy.db"):
        self.db_path = db_path
        self.conn = None
        self._connect()
        
    def _connect(self):
        """Connect to database with proper configuration"""
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
    
    # =============================================================================
    # DIRECTORY MANAGEMENT
    # =============================================================================
    
    def add_indexed_directory(
        self, 
        path: str, 
        file_patterns: Optional[List[str]] = None,
        exclude_patterns: Optional[List[str]] = None,
        index_frequency_minutes: int = 60
    ) -> str:
        """Add a directory to be indexed"""
        try:
            # Normalize path
            normalized_path = os.path.abspath(os.path.expanduser(path))
            
            # Check if directory exists
            if not os.path.exists(normalized_path):
                raise ValueError(f"Directory does not exist: {normalized_path}")
            
            if not os.path.isdir(normalized_path):
                raise ValueError(f"Path is not a directory: {normalized_path}")
            
            # Default patterns
            if file_patterns is None:
                file_patterns = ["*.txt", "*.md", "*.py", "*.js", "*.json", "*.yaml", "*.yml", "*.csv", "*.log"]
            
            if exclude_patterns is None:
                exclude_patterns = ["node_modules", ".git", "__pycache__", "*.pyc", ".env", "venv", "build", "dist"]
            
            directory_id = str(uuid.uuid4())
            
            self.conn.execute("""
                INSERT INTO indexed_directories (
                    id, path, file_patterns, exclude_patterns, index_frequency_minutes, created_at
                ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (
                directory_id,
                normalized_path,
                json.dumps(file_patterns),
                json.dumps(exclude_patterns),
                index_frequency_minutes
            ))
            self.conn.commit()
            
            return directory_id
            
        except Exception as e:
            print(f"Error adding indexed directory: {e}")
            raise
    
    def get_indexed_directories(self, active_only: bool = True) -> List[Dict]:
        """Get all indexed directories"""
        query = "SELECT * FROM indexed_directories"
        if active_only:
            query += " WHERE is_active = TRUE"
        
        cursor = self.conn.execute(query)
        directories = []
        for row in cursor:
            directories.append({
                'id': row['id'],
                'path': row['path'],
                'is_active': bool(row['is_active']),
                'last_indexed_at': row['last_indexed_at'],
                'file_patterns': json.loads(row['file_patterns']),
                'exclude_patterns': json.loads(row['exclude_patterns']),
                'index_frequency_minutes': row['index_frequency_minutes']
            })
        return directories
    
    # =============================================================================
    # FILE SCANNING
    # =============================================================================
    
    def _should_include_file(
        self, 
        file_path: str, 
        file_patterns: List[str], 
        exclude_patterns: List[str]
    ) -> bool:
        """Check if file should be included based on patterns"""
        file_name = os.path.basename(file_path)
        file_parts = Path(file_path).parts
        
        # Check exclude patterns first
        for pattern in exclude_patterns:
            # Check against filename
            if fnmatch.fnmatch(file_name, pattern):
                return False
            # Check against any directory in path
            for part in file_parts:
                if fnmatch.fnmatch(part, pattern):
                    return False
        
        # Check include patterns
        for pattern in file_patterns:
            if fnmatch.fnmatch(file_name, pattern):
                return True
        
        return False
    
    async def scan_directory(
        self, 
        directory_id: str
    ) -> Tuple[List[Dict], List[str]]:
        """
        Scan directory and return list of files with their metadata
        Returns: (files_info, errors)
        """
        # Get directory info
        cursor = self.conn.execute(
            "SELECT * FROM indexed_directories WHERE id = ?", 
            (directory_id,)
        )
        dir_info = cursor.fetchone()
        if not dir_info:
            raise ValueError(f"Directory not found: {directory_id}")
        
        directory_path = dir_info['path']
        file_patterns = json.loads(dir_info['file_patterns'])
        exclude_patterns = json.loads(dir_info['exclude_patterns'])
        
        files_info = []
        errors = []
        
        # Walk directory
        for root, dirs, files in os.walk(directory_path):
            # Remove excluded directories from dirs to prevent walking into them
            dirs[:] = [d for d in dirs if not any(
                fnmatch.fnmatch(d, pattern) for pattern in exclude_patterns
            )]
            
            for file_name in files:
                file_path = os.path.join(root, file_name)
                relative_path = os.path.relpath(file_path, directory_path)
                
                try:
                    if self._should_include_file(file_path, file_patterns, exclude_patterns):
                        stat = os.stat(file_path)
                        
                        # Calculate file hash
                        file_hash = await self._calculate_file_hash(file_path)
                        
                        files_info.append({
                            'file_path': relative_path,
                            'absolute_path': file_path,
                            'file_size': stat.st_size,
                            'last_modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                            'file_hash': file_hash
                        })
                except Exception as e:
                    errors.append(f"Error processing {file_path}: {str(e)}")
                
                # Yield control periodically
                if len(files_info) % 100 == 0:
                    await asyncio.sleep(0)
        
        return files_info, errors
    
    # =============================================================================
    # HASH CALCULATIONS
    # =============================================================================
    
    async def _calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA256 hash of file content"""
        sha256_hash = hashlib.sha256()
        
        try:
            with open(file_path, 'rb') as f:
                # Read in chunks to handle large files
                for chunk in iter(lambda: f.read(65536), b''):
                    sha256_hash.update(chunk)
            return sha256_hash.hexdigest()
        except Exception as e:
            # Return hash of error for consistency
            return hashlib.sha256(f"ERROR:{str(e)}".encode()).hexdigest()
    
    def _calculate_merkle_hash(self, file_path: str, file_hash: str) -> str:
        """Calculate Merkle hash (path + content hash)"""
        combined = f"{file_path}:{file_hash}"
        return hashlib.sha256(combined.encode()).hexdigest()
    
    # =============================================================================
    # MERKLE TREE OPERATIONS
    # =============================================================================
    
    async def build_merkle_tree(self, directory_id: str, files_info: List[Dict]) -> str:
        """
        Build Merkle tree for directory and return root hash
        """
        # Clear existing tree
        self.conn.execute(
            "DELETE FROM merkle_tree WHERE directory_id = ?", 
            (directory_id,)
        )
        
        # Group files by directory
        tree_structure = defaultdict(list)
        for file_info in files_info:
            file_path = file_info['file_path']
            parts = Path(file_path).parts
            
            # Build tree structure
            for i in range(len(parts)):
                parent_path = '/'.join(parts[:i]) if i > 0 else ''
                node_path = '/'.join(parts[:i+1])
                
                if i == len(parts) - 1:
                    # Leaf node (file)
                    merkle_hash = self._calculate_merkle_hash(
                        file_info['file_path'], 
                        file_info['file_hash']
                    )
                    tree_structure[parent_path].append({
                        'path': node_path,
                        'hash': merkle_hash,
                        'is_leaf': True
                    })
                else:
                    # Directory node
                    tree_structure[parent_path].append({
                        'path': node_path,
                        'hash': None,  # Will be calculated later
                        'is_leaf': False
                    })
        
        # Calculate hashes bottom-up
        def calculate_node_hash(node_path: str) -> str:
            """Recursively calculate hash for a node"""
            children = tree_structure.get(node_path, [])
            
            if not children:
                # Empty directory
                return hashlib.sha256(f"EMPTY:{node_path}".encode()).hexdigest()
            
            # Sort children by path for consistency
            children.sort(key=lambda x: x['path'])
            
            # Collect child hashes
            child_hashes = []
            for child in children:
                if child['hash'] is None:
                    # Calculate hash for directory child
                    child['hash'] = calculate_node_hash(child['path'])
                child_hashes.append(child['hash'])
            
            # Combine child hashes
            combined = ':'.join(child_hashes)
            return hashlib.sha256(combined.encode()).hexdigest()
        
        # Calculate root hash
        root_hash = calculate_node_hash('')
        
        # Store tree in database
        all_nodes = []
        for parent_path, children in tree_structure.items():
            for child in children:
                level = len(Path(child['path']).parts) - 1
                all_nodes.append((
                    str(uuid.uuid4()),
                    directory_id,
                    child['path'],
                    child['hash'],
                    child['is_leaf'],
                    parent_path if parent_path else None,
                    level
                ))
        
        # Add root node
        all_nodes.append((
            str(uuid.uuid4()),
            directory_id,
            '',  # Root path
            root_hash,
            False,
            None,
            0
        ))
        
        # Batch insert
        self.conn.executemany("""
            INSERT INTO merkle_tree (
                id, directory_id, node_path, node_hash, is_leaf, parent_path, level
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, all_nodes)
        
        self.conn.commit()
        return root_hash
    
    # =============================================================================
    # CHANGE DETECTION
    # =============================================================================
    
    async def detect_changes(
        self, 
        directory_id: str
    ) -> Dict[str, List[Dict]]:
        """
        Detect file changes in directory
        Returns dict with 'new', 'modified', 'deleted' file lists
        """
        # Scan current state
        current_files, errors = await self.scan_directory(directory_id)
        
        # Get previous state from database
        cursor = self.conn.execute("""
            SELECT file_path, file_hash, merkle_hash 
            FROM file_index 
            WHERE directory_id = ?
        """, (directory_id,))
        
        previous_files = {
            row['file_path']: {
                'file_hash': row['file_hash'],
                'merkle_hash': row['merkle_hash']
            }
            for row in cursor
        }
        
        # Detect changes
        changes = {
            'new': [],
            'modified': [],
            'deleted': [],
            'unchanged': []
        }
        
        current_paths = set()
        
        for file_info in current_files:
            file_path = file_info['file_path']
            current_paths.add(file_path)
            
            if file_path not in previous_files:
                changes['new'].append(file_info)
            elif file_info['file_hash'] != previous_files[file_path]['file_hash']:
                changes['modified'].append(file_info)
            else:
                changes['unchanged'].append(file_info)
        
        # Detect deleted files
        for file_path in previous_files:
            if file_path not in current_paths:
                changes['deleted'].append({
                    'file_path': file_path,
                    'file_hash': previous_files[file_path]['file_hash']
                })
        
        return changes
    
    # =============================================================================
    # INDEX UPDATE
    # =============================================================================
    
    async def update_file_index(
        self, 
        directory_id: str, 
        changes: Dict[str, List[Dict]]
    ) -> None:
        """Update file index based on detected changes"""
        
        # Handle new files
        for file_info in changes['new']:
            file_id = str(uuid.uuid4())
            merkle_hash = self._calculate_merkle_hash(
                file_info['file_path'], 
                file_info['file_hash']
            )
            
            self.conn.execute("""
                INSERT INTO file_index (
                    id, directory_id, file_path, file_hash, merkle_hash,
                    file_size, last_modified, is_indexed, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP)
            """, (
                file_id,
                directory_id,
                file_info['file_path'],
                file_info['file_hash'],
                merkle_hash,
                file_info['file_size'],
                file_info['last_modified']
            ))
        
        # Handle modified files
        for file_info in changes['modified']:
            merkle_hash = self._calculate_merkle_hash(
                file_info['file_path'], 
                file_info['file_hash']
            )
            
            self.conn.execute("""
                UPDATE file_index 
                SET file_hash = ?, merkle_hash = ?, file_size = ?, 
                    last_modified = ?, is_indexed = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE directory_id = ? AND file_path = ?
            """, (
                file_info['file_hash'],
                merkle_hash,
                file_info['file_size'],
                file_info['last_modified'],
                directory_id,
                file_info['file_path']
            ))
        
        # Handle deleted files
        for file_info in changes['deleted']:
            self.conn.execute("""
                DELETE FROM file_index 
                WHERE directory_id = ? AND file_path = ?
            """, (directory_id, file_info['file_path']))
        
        # Update last indexed time
        self.conn.execute("""
            UPDATE indexed_directories 
            SET last_indexed_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        """, (directory_id,))
        
        self.conn.commit()
    
    # =============================================================================
    # UTILITY METHODS
    # =============================================================================
    
    def get_files_to_index(self, directory_id: str) -> List[Dict]:
        """Get files that need to be indexed (new or modified)"""
        cursor = self.conn.execute("""
            SELECT id, file_path, file_size, last_modified 
            FROM file_index 
            WHERE directory_id = ? AND is_indexed = FALSE
            ORDER BY file_size ASC
        """, (directory_id,))
        
        return [
            {
                'id': row['id'],
                'file_path': row['file_path'],
                'file_size': row['file_size'],
                'last_modified': row['last_modified']
            }
            for row in cursor
        ]
    
    def mark_file_as_indexed(
        self, 
        file_id: str, 
        chunk_count: int
    ) -> None:
        """Mark file as indexed with chunk count"""
        self.conn.execute("""
            UPDATE file_index 
            SET is_indexed = TRUE, indexed_at = CURRENT_TIMESTAMP, 
                chunk_count = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (chunk_count, file_id))
        self.conn.commit()
    
    def get_directory_stats(self, directory_id: str) -> Dict:
        """Get statistics for indexed directory"""
        cursor = self.conn.execute("""
            SELECT 
                COUNT(*) as total_files,
                SUM(CASE WHEN is_indexed = TRUE THEN 1 ELSE 0 END) as indexed_files,
                SUM(file_size) as total_size,
                SUM(chunk_count) as total_chunks
            FROM file_index 
            WHERE directory_id = ?
        """, (directory_id,))
        
        row = cursor.fetchone()
        return {
            'total_files': row['total_files'] or 0,
            'indexed_files': row['indexed_files'] or 0,
            'total_size': row['total_size'] or 0,
            'total_chunks': row['total_chunks'] or 0
        }

# Create singleton instance
file_indexer_service = FileIndexerService() 