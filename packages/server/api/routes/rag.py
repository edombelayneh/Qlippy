"""
RAG API Routes
Endpoints for managing file indexing and retrieval
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, status
from typing import List, Dict, Any, Optional
import json

from services.file_indexer_service import file_indexer_service
from services.embedding_service import embedding_service  
from services.rag_retriever_service import rag_retriever_service
from config.models import (
    IndexedDirectory, RAGSettings, RAGQuery, DirectoryRAGContext,
    IndexingProgress, FileIndexStatus
)

router = APIRouter()

# =============================================================================
# DIRECTORY MANAGEMENT
# =============================================================================

@router.post("/directories")
async def add_indexed_directory(directory: IndexedDirectory) -> Dict[str, Any]:
    """Add a directory to be indexed"""
    try:
        directory_id = file_indexer_service.add_indexed_directory(
            path=directory.path,
            file_patterns=directory.file_patterns,
            exclude_patterns=directory.exclude_patterns,
            index_frequency_minutes=directory.index_frequency_minutes
        )
        
        return {
            "status": "success",
            "data": {
                "id": directory_id,
                "message": "Directory added successfully"
            }
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"Error adding directory: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add directory"
        )

@router.get("/directories")
async def get_indexed_directories(active_only: bool = True) -> Dict[str, Any]:
    """Get all indexed directories"""
    try:
        directories = file_indexer_service.get_indexed_directories(active_only)
        
        # Add stats for each directory
        for directory in directories:
            stats = file_indexer_service.get_directory_stats(directory['id'])
            directory['stats'] = stats
        
        return {
            "status": "success",
            "data": directories
        }
    except Exception as e:
        print(f"Error getting directories: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve directories"
        )

@router.delete("/directories/{directory_id}")
async def remove_indexed_directory(directory_id: str) -> Dict[str, Any]:
    """Remove a directory from indexing"""
    try:
        # Mark as inactive (we don't delete to preserve history)
        file_indexer_service.conn.execute(
            "UPDATE indexed_directories SET is_active = FALSE WHERE id = ?",
            (directory_id,)
        )
        file_indexer_service.conn.commit()
        
        return {
            "status": "success",
            "message": "Directory removed from indexing"
        }
    except Exception as e:
        print(f"Error removing directory: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove directory"
        )

# =============================================================================
# INDEXING
# =============================================================================

@router.post("/directories/{directory_id}/scan")
async def scan_directory(directory_id: str) -> Dict[str, Any]:
    """Scan directory for changes"""
    try:
        changes = await file_indexer_service.detect_changes(directory_id)
        
        return {
            "status": "success",
            "data": {
                "new_files": len(changes['new']),
                "modified_files": len(changes['modified']),
                "deleted_files": len(changes['deleted']),
                "unchanged_files": len(changes['unchanged'])
            }
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        print(f"Error scanning directory: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to scan directory"
        )

@router.post("/directories/{directory_id}/index")
async def index_directory(directory_id: str) -> Dict[str, Any]:
    """Index a directory (non-streaming)"""
    try:
        stats = await rag_retriever_service.index_directory_with_progress(directory_id)
        
        return {
            "status": "success",
            "data": stats
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        print(f"Error indexing directory: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to index directory"
        )

@router.websocket("/directories/{directory_id}/index-stream")
async def index_directory_stream(websocket: WebSocket, directory_id: str):
    """Index directory with progress streaming via WebSocket"""
    await websocket.accept()
    
    try:
        async def send_progress(progress_data: Dict):
            await websocket.send_json(progress_data)
        
        stats = await rag_retriever_service.index_directory_with_progress(
            directory_id,
            progress_callback=send_progress
        )
        
        # Send final stats
        await websocket.send_json({
            "status": "complete",
            "stats": stats
        })
        
    except WebSocketDisconnect:
        print("WebSocket disconnected during indexing")
    except Exception as e:
        print(f"Error during streaming index: {e}")
        await websocket.send_json({
            "status": "error",
            "message": str(e)
        })
    finally:
        await websocket.close()

# =============================================================================
# CONVERSATION CONTEXT
# =============================================================================

@router.post("/conversations/{conversation_id}/context")
async def add_conversation_context(
    conversation_id: str,
    context: DirectoryRAGContext
) -> Dict[str, Any]:
    """Link a directory to a conversation"""
    try:
        context_id = rag_retriever_service.add_conversation_context(
            conversation_id=conversation_id,
            directory_id=context.directory_id
        )
        
        return {
            "status": "success",
            "data": {
                "id": context_id,
                "message": "Context added successfully"
            }
        }
    except Exception as e:
        print(f"Error adding conversation context: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add conversation context"
        )

@router.get("/conversations/{conversation_id}/context")
async def get_conversation_contexts(conversation_id: str) -> Dict[str, Any]:
    """Get all contexts for a conversation"""
    try:
        contexts = rag_retriever_service.get_conversation_contexts(conversation_id)
        
        return {
            "status": "success",
            "data": contexts
        }
    except Exception as e:
        print(f"Error getting conversation contexts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversation contexts"
        )

@router.delete("/conversations/{conversation_id}/context/{directory_id}")
async def remove_conversation_context(
    conversation_id: str,
    directory_id: str
) -> Dict[str, Any]:
    """Remove a directory from conversation context"""
    try:
        success = rag_retriever_service.remove_conversation_context(
            conversation_id=conversation_id,
            directory_id=directory_id
        )
        
        if success:
            return {
                "status": "success",
                "message": "Context removed successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Context not found"
            )
    except Exception as e:
        print(f"Error removing conversation context: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove conversation context"
        )

# =============================================================================
# RETRIEVAL
# =============================================================================

@router.post("/retrieve")
async def retrieve_chunks(query: RAGQuery) -> Dict[str, Any]:
    """Retrieve relevant chunks for a query"""
    try:
        response = await rag_retriever_service.retrieve_chunks(query)
        
        return {
            "status": "success",
            "data": response.dict()
        }
    except Exception as e:
        print(f"Error retrieving chunks: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve chunks"
        )

@router.post("/retrieve-context")
async def retrieve_context(query: RAGQuery) -> Dict[str, Any]:
    """Retrieve and format context for LLM"""
    try:
        context, metadata = await rag_retriever_service.retrieve_and_format_context(
            query=query.query,
            conversation_id=query.conversation_id
        )
        
        return {
            "status": "success",
            "data": {
                "context": context,
                "chunks": metadata
            }
        }
    except Exception as e:
        print(f"Error retrieving context: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve context"
        )

# =============================================================================
# SETTINGS
# =============================================================================

@router.get("/settings")
async def get_rag_settings() -> Dict[str, Any]:
    """Get RAG settings"""
    try:
        cursor = file_indexer_service.conn.execute(
            "SELECT * FROM rag_settings WHERE id = 1"
        )
        row = cursor.fetchone()
        
        if row:
            settings = RAGSettings(
                chunk_size=row['chunk_size'],
                chunk_overlap=row['chunk_overlap'],
                embedding_model=row['embedding_model'],
                top_k_results=row['top_k_results'],
                min_relevance_score=row['min_relevance_score']
            )
        else:
            settings = RAGSettings()
        
        return {
            "status": "success",
            "data": settings.dict()
        }
    except Exception as e:
        print(f"Error getting RAG settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve RAG settings"
        )

@router.post("/settings")
async def update_rag_settings(settings: RAGSettings) -> Dict[str, Any]:
    """Update RAG settings"""
    try:
        file_indexer_service.conn.execute("""
            UPDATE rag_settings SET
                chunk_size = ?,
                chunk_overlap = ?,
                embedding_model = ?,
                top_k_results = ?,
                min_relevance_score = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        """, (
            settings.chunk_size,
            settings.chunk_overlap,
            settings.embedding_model,
            settings.top_k_results,
            settings.min_relevance_score
        ))
        file_indexer_service.conn.commit()
        
        # Reload embedding model if changed
        current_model = embedding_service.embedding_model.get_sentence_embedding_dimension()
        if settings.embedding_model != current_model:
            embedding_service._load_embedding_model()
        
        return {
            "status": "success",
            "message": "Settings updated successfully"
        }
    except Exception as e:
        print(f"Error updating RAG settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update RAG settings"
        )

# =============================================================================
# CLEAR RAG INDEX
# =============================================================================

@router.post("/clear-index")
async def clear_rag_index() -> Dict[str, Any]:
    """Clear all RAG index data (embeddings, file index, directory contexts)"""
    try:
        # Clear embedding collection
        embedding_service.clear_collection()
        
        # Clear file index and related tables
        file_indexer_service.conn.execute("DELETE FROM message_rag_chunks")
        file_indexer_service.conn.execute("DELETE FROM conversation_rag_context")
        file_indexer_service.conn.execute("DELETE FROM embedding_metadata")
        file_indexer_service.conn.execute("DELETE FROM file_index")
        file_indexer_service.conn.execute("DELETE FROM merkle_tree")
        file_indexer_service.conn.execute("UPDATE indexed_directories SET last_indexed_at = NULL")
        file_indexer_service.conn.commit()
        
        return {
            "status": "success",
            "message": "RAG index cleared successfully"
        }
    except Exception as e:
        print(f"Error clearing RAG index: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear RAG index"
        )

@router.get("/index-stats")
async def get_rag_index_stats() -> Dict[str, Any]:
    """Get statistics about the RAG index"""
    try:
        # Get file counts
        cursor = file_indexer_service.conn.execute("""
            SELECT 
                COUNT(*) as total_files,
                SUM(CASE WHEN is_indexed = 1 THEN 1 ELSE 0 END) as indexed_files,
                SUM(chunk_count) as total_chunks
            FROM file_index
        """)
        file_stats = cursor.fetchone()
        
        # Get directory counts
        cursor = file_indexer_service.conn.execute("""
            SELECT COUNT(*) as total_directories
            FROM indexed_directories WHERE is_active = 1
        """)
        dir_stats = cursor.fetchone()
        
        # Get conversation context counts
        cursor = file_indexer_service.conn.execute("""
            SELECT COUNT(*) as active_contexts
            FROM conversation_rag_context WHERE is_active = 1
        """)
        context_stats = cursor.fetchone()
        
        return {
            "status": "success",
            "data": {
                "total_directories": dir_stats['total_directories'],
                "total_files": file_stats['total_files'],
                "indexed_files": file_stats['indexed_files'],
                "total_chunks": file_stats['total_chunks'] or 0,
                "active_conversation_contexts": context_stats['active_contexts']
            }
        }
    except Exception as e:
        print(f"Error getting RAG index stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get RAG index statistics"
        )

# =============================================================================
# STATISTICS
# =============================================================================

@router.get("/stats")
async def get_rag_statistics() -> Dict[str, Any]:
    """Get overall RAG statistics"""
    try:
        # Get collection stats
        collection_stats = embedding_service.get_collection_stats()
        
        # Get directory count
        cursor = file_indexer_service.conn.execute(
            "SELECT COUNT(*) as count FROM indexed_directories WHERE is_active = TRUE"
        )
        directory_count = cursor.fetchone()['count']
        
        # Get file count
        cursor = file_indexer_service.conn.execute(
            "SELECT COUNT(*) as count, SUM(file_size) as total_size FROM file_index"
        )
        file_stats = cursor.fetchone()
        
        return {
            "status": "success",
            "data": {
                "directories": directory_count,
                "files": file_stats['count'] or 0,
                "total_size": file_stats['total_size'] or 0,
                "embeddings": collection_stats['total_embeddings'],
                "directory_breakdown": collection_stats['directories']
            }
        }
    except Exception as e:
        print(f"Error getting RAG statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve RAG statistics"
        ) 