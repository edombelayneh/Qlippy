"""
RAG Retriever Service
Handles retrieval of relevant file chunks for conversations
"""

import json
import sqlite3
import asyncio
from typing import List, Dict, Optional, Tuple
import uuid
from datetime import datetime
import os

from services.file_indexer_service import file_indexer_service
from services.embedding_service import embedding_service
from config.models import RAGQuery, RAGResponse, RAGChunk

class RAGRetrieverService:
    """Service for retrieving relevant content for conversations"""
    
    def __init__(self, db_path: str = "qlippy.db"):
        self.db_path = db_path
        self.conn = None
        self._connect()
        self.file_indexer = file_indexer_service
        self.embedding_service = embedding_service
    
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
    # CONVERSATION CONTEXT MANAGEMENT
    # =============================================================================
    
    def add_conversation_context(
        self, 
        conversation_id: str, 
        directory_id: str
    ) -> str:
        """Link a directory to a conversation for RAG context"""
        try:
            context_id = str(uuid.uuid4())
            
            self.conn.execute("""
                INSERT INTO conversation_rag_context (
                    id, conversation_id, directory_id, is_active, created_at
                ) VALUES (?, ?, ?, TRUE, CURRENT_TIMESTAMP)
            """, (context_id, conversation_id, directory_id))
            
            self.conn.commit()
            return context_id
            
        except sqlite3.IntegrityError:
            # Already exists
            cursor = self.conn.execute("""
                SELECT id FROM conversation_rag_context 
                WHERE conversation_id = ? AND directory_id = ?
            """, (conversation_id, directory_id))
            
            row = cursor.fetchone()
            return row['id'] if row else None
        except Exception as e:
            print(f"Error adding conversation context: {e}")
            raise
    
    def remove_conversation_context(
        self, 
        conversation_id: str, 
        directory_id: str
    ) -> bool:
        """Remove a directory from conversation context"""
        try:
            self.conn.execute("""
                UPDATE conversation_rag_context 
                SET is_active = FALSE 
                WHERE conversation_id = ? AND directory_id = ?
            """, (conversation_id, directory_id))
            
            self.conn.commit()
            return True
            
        except Exception as e:
            print(f"Error removing conversation context: {e}")
            return False
    
    def get_conversation_contexts(
        self, 
        conversation_id: str
    ) -> List[Dict]:
        """Get all active directories for a conversation"""
        cursor = self.conn.execute("""
            SELECT 
                crc.id,
                crc.directory_id,
                id.path,
                id.last_indexed_at
            FROM conversation_rag_context crc
            JOIN indexed_directories id ON crc.directory_id = id.id
            WHERE crc.conversation_id = ? AND crc.is_active = TRUE
        """, (conversation_id,))
        
        contexts = []
        for row in cursor:
            contexts.append({
                'id': row['id'],
                'directory_id': row['directory_id'],
                'path': row['path'],
                'last_indexed_at': row['last_indexed_at']
            })
        
        return contexts
    
    # =============================================================================
    # RAG RETRIEVAL
    # =============================================================================
    
    async def retrieve_chunks(
        self,
        query: RAGQuery
    ) -> RAGResponse:
        """
        Retrieve relevant chunks for a query
        """
        try:
            # Get directory IDs if not provided
            directory_ids = query.directory_ids
            if not directory_ids:
                # Get from conversation context
                contexts = self.get_conversation_contexts(query.conversation_id)
                directory_ids = [ctx['directory_id'] for ctx in contexts]
            
            if not directory_ids:
                # No directories configured
                return RAGResponse(
                    chunks=[],
                    query=query.query,
                    total_chunks_searched=0
                )
            
            # Get RAG settings
            cursor = self.conn.execute("""
                SELECT top_k_results, min_relevance_score 
                FROM rag_settings WHERE id = 1
            """)
            row = cursor.fetchone()
            
            top_k = query.top_k or (row['top_k_results'] if row else 5)
            min_score = query.min_score or (row['min_relevance_score'] if row else 0.3)
            
            # Search embeddings
            search_results = self.embedding_service.search(
                query=query.query,
                directory_ids=directory_ids,
                top_k=top_k,
                min_score=min_score
            )
            
            # Convert to RAGChunk objects
            chunks = []
            for result in search_results:
                chunk = RAGChunk(
                    content=result['content'],
                    file_path=result['file_path'],
                    chunk_index=result['chunk_index'],
                    relevance_score=result['relevance_score'],
                    metadata=result['metadata']
                )
                chunks.append(chunk)
            
            # Get total chunks searched
            total_chunks = 0
            for dir_id in directory_ids:
                stats = self.file_indexer.get_directory_stats(dir_id)
                total_chunks += stats['total_chunks']
            
            return RAGResponse(
                chunks=chunks,
                query=query.query,
                total_chunks_searched=total_chunks
            )
            
        except Exception as e:
            print(f"Error retrieving chunks: {e}")
            return RAGResponse(
                chunks=[],
                query=query.query,
                total_chunks_searched=0
            )
    
    async def retrieve_and_format_context(
        self,
        query: str,
        conversation_id: str,
        max_context_length: int = 4000
    ) -> Tuple[str, List[Dict]]:
        """
        Retrieve chunks and format them as context for LLM
        Returns: (formatted_context, chunk_metadata)
        """
        # Create query
        rag_query = RAGQuery(
            query=query,
            conversation_id=conversation_id
        )
        
        # Retrieve chunks
        response = await self.retrieve_chunks(rag_query)
        
        if not response.chunks:
            return "", []
        
        # Format chunks as context
        context_parts = []
        chunk_metadata = []
        current_length = 0
        
        for chunk in response.chunks:
            # Format chunk with source info
            chunk_text = f"\n---\nSource: {chunk.file_path} (chunk {chunk.chunk_index + 1})\n{chunk.content}\n---"
            chunk_length = len(chunk_text)
            
            # Check if adding this chunk would exceed limit
            if current_length + chunk_length > max_context_length:
                break
            
            context_parts.append(chunk_text)
            current_length += chunk_length
            
            # Store metadata
            chunk_metadata.append({
                'file_path': chunk.file_path,
                'chunk_index': chunk.chunk_index,
                'relevance_score': chunk.relevance_score
            })
        
        # Create formatted context
        if context_parts:
            context = f"Based on the following relevant information from your indexed files:\n{''.join(context_parts)}\n\n"
        else:
            context = ""
        
        return context, chunk_metadata
    
    # =============================================================================
    # MESSAGE CHUNK CACHING
    # =============================================================================
    
    async def cache_message_chunks(
        self,
        message_id: str,
        chunks: List[Dict]
    ) -> None:
        """Cache retrieved chunks for a message"""
        try:
            records = []
            for i, chunk in enumerate(chunks):
                # Get embedding ID from metadata
                cursor = self.conn.execute("""
                    SELECT em.embedding_id 
                    FROM embedding_metadata em
                    JOIN file_index fi ON em.file_id = fi.id
                    WHERE fi.file_path = ? AND em.chunk_index = ?
                """, (chunk['file_path'], chunk['chunk_index']))
                
                row = cursor.fetchone()
                if row:
                    records.append((
                        str(uuid.uuid4()),
                        message_id,
                        row['embedding_id'],
                        chunk['relevance_score'],
                        i
                    ))
            
            if records:
                self.conn.executemany("""
                    INSERT INTO message_rag_chunks (
                        id, message_id, embedding_id, relevance_score, chunk_order
                    ) VALUES (?, ?, ?, ?, ?)
                """, records)
                
                self.conn.commit()
                
        except Exception as e:
            print(f"Error caching message chunks: {e}")
    
    def get_message_chunks(self, message_id: str) -> List[Dict]:
        """Get cached chunks for a message"""
        cursor = self.conn.execute("""
            SELECT 
                mrc.relevance_score,
                mrc.chunk_order,
                em.chunk_index,
                fi.file_path
            FROM message_rag_chunks mrc
            JOIN embedding_metadata em ON mrc.embedding_id = em.embedding_id
            JOIN file_index fi ON em.file_id = fi.id
            WHERE mrc.message_id = ?
            ORDER BY mrc.chunk_order
        """, (message_id,))
        
        chunks = []
        for row in cursor:
            chunks.append({
                'file_path': row['file_path'],
                'chunk_index': row['chunk_index'],
                'relevance_score': row['relevance_score']
            })
        
        return chunks
    
    # =============================================================================
    # INDEXING ORCHESTRATION
    # =============================================================================
    
    async def index_directory_with_progress(
        self,
        directory_id: str,
        progress_callback: Optional[callable] = None
    ) -> Dict:
        """
        Index a directory with progress updates
        Returns statistics about the indexing
        """
        stats = {
            'total_files': 0,
            'indexed_files': 0,
            'total_chunks': 0,
            'errors': []
        }
        
        try:
            # Detect changes
            if progress_callback:
                await progress_callback({
                    'status': 'scanning',
                    'message': 'Scanning directory for changes...'
                })
            
            changes = await self.file_indexer.detect_changes(directory_id)
            
            # Update file index
            await self.file_indexer.update_file_index(directory_id, changes)
            
            # Get files to index
            files_to_index = self.file_indexer.get_files_to_index(directory_id)
            stats['total_files'] = len(files_to_index)
            
            # Index each file
            for i, file_info in enumerate(files_to_index):
                if progress_callback:
                    await progress_callback({
                        'status': 'indexing',
                        'current_file': file_info['file_path'],
                        'progress': i / len(files_to_index),
                        'message': f'Indexing {file_info["file_path"]}...'
                    })
                
                try:
                    # Get absolute path
                    cursor = self.conn.execute("""
                        SELECT id.path 
                        FROM file_index fi
                        JOIN indexed_directories id ON fi.directory_id = id.id
                        WHERE fi.id = ?
                    """, (file_info['id'],))
                    
                    row = cursor.fetchone()
                    if row:
                        base_path = row['path']
                        absolute_path = os.path.join(base_path, file_info['file_path'])
                        
                        # Index file
                        chunk_count = await self.embedding_service.index_file(
                            file_id=file_info['id'],
                            file_path=file_info['file_path'],
                            directory_id=directory_id,
                            absolute_path=absolute_path
                        )
                        
                        # Mark as indexed
                        self.file_indexer.mark_file_as_indexed(
                            file_info['id'], 
                            chunk_count
                        )
                        
                        stats['indexed_files'] += 1
                        stats['total_chunks'] += chunk_count
                        
                except Exception as e:
                    error_msg = f"Failed to index {file_info['file_path']}: {str(e)}"
                    print(error_msg)
                    stats['errors'].append(error_msg)
            
            # Build Merkle tree
            if progress_callback:
                await progress_callback({
                    'status': 'finalizing',
                    'message': 'Building Merkle tree...'
                })
            
            files_info, _ = await self.file_indexer.scan_directory(directory_id)
            await self.file_indexer.build_merkle_tree(directory_id, files_info)
            
            if progress_callback:
                await progress_callback({
                    'status': 'complete',
                    'message': f'Indexed {stats["indexed_files"]} files with {stats["total_chunks"]} chunks'
                })
            
        except Exception as e:
            print(f"Error during indexing: {e}")
            stats['errors'].append(str(e))
            
            if progress_callback:
                await progress_callback({
                    'status': 'error',
                    'message': str(e)
                })
        
        return stats
    
    # =============================================================================
    # BACKGROUND WORKER
    # =============================================================================
    
    async def start_background_indexing(self):
        """
        Start background task to periodically check and index directories
        This should be called once at startup
        """
        while True:
            try:
                # Get all active directories
                directories = self.file_indexer.get_indexed_directories(active_only=True)
                
                for directory in directories:
                    # Check if it's time to reindex
                    last_indexed = directory.get('last_indexed_at')
                    if last_indexed:
                        # Parse datetime and check interval
                        last_indexed_dt = datetime.fromisoformat(last_indexed)
                        time_since_index = datetime.now() - last_indexed_dt
                        minutes_since_index = time_since_index.total_seconds() / 60
                        
                        if minutes_since_index < directory['index_frequency_minutes']:
                            continue
                    
                    # Index directory
                    print(f"Background indexing: {directory['path']}")
                    await self.index_directory_with_progress(directory['id'])
                
                # Wait before next check (5 minutes)
                await asyncio.sleep(300)
                
            except Exception as e:
                print(f"Error in background indexing: {e}")
                await asyncio.sleep(60)  # Wait 1 minute on error

# Create singleton instance
rag_retriever_service = RAGRetrieverService() 