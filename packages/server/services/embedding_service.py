"""
Embedding Service
Handles file chunking, embedding generation, and vector storage using Chroma
"""

import os
import json
import sqlite3
import hashlib
import asyncio
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import uuid
from datetime import datetime

# Local embedding dependencies
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import numpy as np

# Text processing
import chardet
import pypdf
from langchain.text_splitter import (
    RecursiveCharacterTextSplitter,
    MarkdownTextSplitter,
    PythonCodeTextSplitter,
    Language
)

class EmbeddingService:
    """Service for generating embeddings and managing vector storage"""
    
    def __init__(self, db_path: str = "qlippy.db", chroma_path: str = "./chroma_db"):
        self.db_path = db_path
        self.chroma_path = chroma_path
        self.conn = None
        self._connect()
        
        # Initialize Chroma client with local persistence
        self.chroma_client = chromadb.PersistentClient(
            path=chroma_path,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Initialize local embedding model
        self.embedding_model = None
        self._load_embedding_model()
        
        # Initialize collection
        self.collection = None
        self._init_collection()
    
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
    # MODEL AND COLLECTION MANAGEMENT
    # =============================================================================
    
    def _load_embedding_model(self):
        """Load the sentence transformer model"""
        try:
            # Get model name from settings
            cursor = self.conn.execute(
                "SELECT embedding_model FROM rag_settings WHERE id = 1"
            )
            row = cursor.fetchone()
            model_name = row['embedding_model'] if row else 'all-MiniLM-L6-v2'
            
            print(f"Loading embedding model: {model_name}")
            self.embedding_model = SentenceTransformer(model_name)
            print("Embedding model loaded successfully")
            
        except Exception as e:
            print(f"Error loading embedding model: {e}")
            # Fallback to a smaller model
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    
    def _init_collection(self):
        """Initialize or get Chroma collection"""
        try:
            # Get or create collection
            self.collection = self.chroma_client.get_or_create_collection(
                name="qlippy_documents",
                metadata={"description": "Qlippy document embeddings"}
            )
            print(f"Chroma collection initialized: {self.collection.count()} documents")
        except Exception as e:
            print(f"Error initializing Chroma collection: {e}")
            raise
    
    # =============================================================================
    # TEXT EXTRACTION
    # =============================================================================
    
    async def extract_text_from_file(self, file_path: str) -> Tuple[str, Dict]:
        """
        Extract text from various file types
        Returns: (text_content, metadata)
        """
        file_ext = Path(file_path).suffix.lower()
        metadata = {
            'file_type': file_ext,
            'extraction_method': 'unknown'
        }
        
        try:
            if file_ext == '.pdf':
                return await self._extract_pdf_text(file_path, metadata)
            elif file_ext in ['.txt', '.md', '.markdown']:
                return await self._extract_plain_text(file_path, metadata)
            elif file_ext in ['.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.h', '.hpp']:
                return await self._extract_code_text(file_path, metadata)
            elif file_ext in ['.json', '.yaml', '.yml']:
                return await self._extract_structured_text(file_path, metadata)
            elif file_ext in ['.csv', '.tsv']:
                return await self._extract_tabular_text(file_path, metadata)
            else:
                # Try to read as plain text
                return await self._extract_plain_text(file_path, metadata)
                
        except Exception as e:
            print(f"Error extracting text from {file_path}: {e}")
            return f"Error reading file: {str(e)}", metadata
    
    async def _extract_plain_text(self, file_path: str, metadata: Dict) -> Tuple[str, Dict]:
        """Extract plain text with encoding detection"""
        try:
            # Detect encoding
            with open(file_path, 'rb') as f:
                raw_data = f.read()
                detected = chardet.detect(raw_data)
                encoding = detected['encoding'] or 'utf-8'
            
            # Read with detected encoding
            with open(file_path, 'r', encoding=encoding) as f:
                text = f.read()
            
            metadata['extraction_method'] = 'plain_text'
            metadata['encoding'] = encoding
            return text, metadata
            
        except Exception as e:
            # Fallback to reading with errors ignored
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
            metadata['extraction_method'] = 'plain_text_fallback'
            return text, metadata
    
    async def _extract_pdf_text(self, file_path: str, metadata: Dict) -> Tuple[str, Dict]:
        """Extract text from PDF files"""
        try:
            text_parts = []
            with open(file_path, 'rb') as f:
                pdf_reader = pypdf.PdfReader(f)
                metadata['page_count'] = len(pdf_reader.pages)
                
                for page_num, page in enumerate(pdf_reader.pages):
                    page_text = page.extract_text()
                    if page_text.strip():
                        text_parts.append(f"--- Page {page_num + 1} ---\n{page_text}")
            
            metadata['extraction_method'] = 'pypdf'
            return '\n\n'.join(text_parts), metadata
            
        except Exception as e:
            print(f"Error extracting PDF text: {e}")
            metadata['extraction_method'] = 'pdf_failed'
            return f"Failed to extract PDF content: {str(e)}", metadata
    
    async def _extract_code_text(self, file_path: str, metadata: Dict) -> Tuple[str, Dict]:
        """Extract code with syntax awareness"""
        text, _ = await self._extract_plain_text(file_path, metadata)
        metadata['extraction_method'] = 'code'
        
        # Add file path as comment at the top for context
        file_comment = f"# File: {file_path}\n\n"
        return file_comment + text, metadata
    
    async def _extract_structured_text(self, file_path: str, metadata: Dict) -> Tuple[str, Dict]:
        """Extract structured data (JSON, YAML) as formatted text"""
        text, _ = await self._extract_plain_text(file_path, metadata)
        metadata['extraction_method'] = 'structured'
        return text, metadata
    
    async def _extract_tabular_text(self, file_path: str, metadata: Dict) -> Tuple[str, Dict]:
        """Extract CSV/TSV data"""
        text, _ = await self._extract_plain_text(file_path, metadata)
        metadata['extraction_method'] = 'tabular'
        return text, metadata
    
    # =============================================================================
    # TEXT CHUNKING
    # =============================================================================
    
    def get_text_splitter(self, file_type: str, chunk_size: int, chunk_overlap: int):
        """Get appropriate text splitter based on file type"""
        
        if file_type in ['.md', '.markdown']:
            return MarkdownTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap
            )
        elif file_type == '.py':
            return PythonCodeTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap
            )
        elif file_type in ['.js', '.ts', '.jsx', '.tsx']:
            return RecursiveCharacterTextSplitter.from_language(
                language=Language.JS,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap
            )
        else:
            # Default recursive splitter
            return RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                separators=["\n\n", "\n", ". ", " ", ""]
            )
    
    async def chunk_text(
        self, 
        text: str, 
        file_path: str,
        file_type: str,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None
    ) -> List[Dict]:
        """
        Split text into chunks with metadata
        Returns list of chunks with metadata
        """
        # Get chunking parameters from settings
        if chunk_size is None or chunk_overlap is None:
            cursor = self.conn.execute(
                "SELECT chunk_size, chunk_overlap FROM rag_settings WHERE id = 1"
            )
            row = cursor.fetchone()
            if row:
                chunk_size = chunk_size or row['chunk_size']
                chunk_overlap = chunk_overlap or row['chunk_overlap']
            else:
                chunk_size = chunk_size or 1000
                chunk_overlap = chunk_overlap or 200
        
        # Get appropriate splitter
        splitter = self.get_text_splitter(file_type, chunk_size, chunk_overlap)
        
        # Split text
        chunks = splitter.split_text(text)
        
        # Create chunk metadata
        chunk_data = []
        current_position = 0
        
        for i, chunk_text in enumerate(chunks):
            # Find chunk position in original text
            chunk_start = text.find(chunk_text, current_position)
            if chunk_start == -1:
                chunk_start = current_position
            chunk_end = chunk_start + len(chunk_text)
            current_position = chunk_start + 1
            
            # Calculate chunk hash
            chunk_hash = hashlib.sha256(chunk_text.encode()).hexdigest()
            
            chunk_data.append({
                'chunk_index': i,
                'content': chunk_text,
                'start_char': chunk_start,
                'end_char': chunk_end,
                'chunk_hash': chunk_hash,
                'metadata': {
                    'file_path': file_path,
                    'file_type': file_type,
                    'chunk_index': i,
                    'total_chunks': len(chunks)
                }
            })
        
        return chunk_data
    
    # =============================================================================
    # EMBEDDING GENERATION
    # =============================================================================
    
    def generate_embeddings(self, texts: List[str]) -> np.ndarray:
        """Generate embeddings for a list of texts"""
        if not self.embedding_model:
            raise ValueError("Embedding model not loaded")
        
        # Generate embeddings
        embeddings = self.embedding_model.encode(
            texts,
            convert_to_numpy=True,
            show_progress_bar=len(texts) > 10
        )
        
        return embeddings
    
    # =============================================================================
    # VECTOR STORAGE
    # =============================================================================
    
    async def index_file(
        self, 
        file_id: str,
        file_path: str,
        directory_id: str,
        absolute_path: str
    ) -> int:
        """
        Index a file by extracting text, chunking, and storing embeddings
        Returns number of chunks created
        """
        try:
            # Extract text
            text_content, extraction_metadata = await self.extract_text_from_file(absolute_path)
            
            if not text_content.strip():
                print(f"No text content found in {file_path}")
                return 0
            
            # Chunk text
            chunks = await self.chunk_text(
                text_content,
                file_path,
                extraction_metadata['file_type']
            )
            
            if not chunks:
                print(f"No chunks created for {file_path}")
                return 0
            
            # Prepare data for batch operations
            chunk_texts = [chunk['content'] for chunk in chunks]
            
            # Generate embeddings
            embeddings = self.generate_embeddings(chunk_texts)
            
            # Prepare Chroma documents
            documents = []
            metadatas = []
            ids = []
            embedding_metadata_records = []
            
            for i, chunk in enumerate(chunks):
                embedding_id = str(uuid.uuid4())
                
                # Document text
                documents.append(chunk['content'])
                
                # Metadata for Chroma
                metadata = {
                    'file_id': file_id,
                    'file_path': file_path,
                    'directory_id': directory_id,
                    'chunk_index': chunk['chunk_index'],
                    'start_char': chunk['start_char'],
                    'end_char': chunk['end_char'],
                    'chunk_hash': chunk['chunk_hash'],
                    **chunk['metadata'],
                    **extraction_metadata
                }
                metadatas.append(metadata)
                
                # ID for Chroma
                ids.append(embedding_id)
                
                # Record for SQLite
                embedding_metadata_records.append((
                    str(uuid.uuid4()),  # id
                    file_id,
                    chunk['chunk_index'],
                    chunk['start_char'],
                    chunk['end_char'],
                    chunk['chunk_hash'],
                    embedding_id
                ))
            
            # Add to Chroma
            self.collection.add(
                documents=documents,
                embeddings=embeddings.tolist(),
                metadatas=metadatas,
                ids=ids
            )
            
            # Store metadata in SQLite
            self.conn.executemany("""
                INSERT INTO embedding_metadata (
                    id, file_id, chunk_index, start_char, end_char, chunk_hash, embedding_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, embedding_metadata_records)
            
            self.conn.commit()
            
            print(f"Indexed {len(chunks)} chunks for {file_path}")
            return len(chunks)
            
        except Exception as e:
            print(f"Error indexing file {file_path}: {e}")
            raise
    
    async def remove_file_embeddings(self, file_id: str) -> int:
        """
        Remove all embeddings for a file
        Returns number of embeddings removed
        """
        try:
            # Get embedding IDs from SQLite
            cursor = self.conn.execute(
                "SELECT embedding_id FROM embedding_metadata WHERE file_id = ?",
                (file_id,)
            )
            embedding_ids = [row['embedding_id'] for row in cursor]
            
            if embedding_ids:
                # Remove from Chroma
                self.collection.delete(ids=embedding_ids)
                
                # Remove from SQLite
                self.conn.execute(
                    "DELETE FROM embedding_metadata WHERE file_id = ?",
                    (file_id,)
                )
                self.conn.commit()
            
            return len(embedding_ids)
            
        except Exception as e:
            print(f"Error removing embeddings for file {file_id}: {e}")
            raise
    
    # =============================================================================
    # SEARCH AND RETRIEVAL
    # =============================================================================
    
    def search(
        self,
        query: str,
        directory_ids: Optional[List[str]] = None,
        top_k: int = 5,
        min_score: Optional[float] = None
    ) -> List[Dict]:
        """
        Search for relevant chunks
        Returns list of chunks with relevance scores
        """
        try:
            # Generate query embedding
            query_embedding = self.generate_embeddings([query])[0]
            
            # Build where clause for filtering
            where = {}
            if directory_ids:
                where["directory_id"] = {"$in": directory_ids}
            
            # Search in Chroma
            results = self.collection.query(
                query_embeddings=[query_embedding.tolist()],
                n_results=top_k,
                where=where if where else None,
                include=["documents", "metadatas", "distances"]
            )
            
            # Process results
            chunks = []
            for i in range(len(results['documents'][0])):
                # Convert distance to similarity score (1 - normalized distance)
                distance = results['distances'][0][i]
                score = 1 / (1 + distance)  # Convert to similarity
                
                # Apply minimum score filter
                if min_score and score < min_score:
                    continue
                
                chunks.append({
                    'content': results['documents'][0][i],
                    'file_path': results['metadatas'][0][i]['file_path'],
                    'chunk_index': results['metadatas'][0][i]['chunk_index'],
                    'relevance_score': score,
                    'metadata': results['metadatas'][0][i]
                })
            
            # Sort by relevance score
            chunks.sort(key=lambda x: x['relevance_score'], reverse=True)
            
            return chunks
            
        except Exception as e:
            print(f"Error searching embeddings: {e}")
            return []
    
    # =============================================================================
    # UTILITY METHODS
    # =============================================================================
    
    def get_collection_stats(self) -> Dict:
        """Get statistics about the vector collection"""
        try:
            count = self.collection.count()
            
            # Get directory breakdown from SQLite
            cursor = self.conn.execute("""
                SELECT 
                    d.path,
                    COUNT(DISTINCT em.file_id) as file_count,
                    COUNT(em.id) as chunk_count
                FROM embedding_metadata em
                JOIN file_index fi ON em.file_id = fi.id
                JOIN indexed_directories d ON fi.directory_id = d.id
                GROUP BY d.id, d.path
            """)
            
            directory_stats = []
            for row in cursor:
                directory_stats.append({
                    'path': row['path'],
                    'file_count': row['file_count'],
                    'chunk_count': row['chunk_count']
                })
            
            return {
                'total_embeddings': count,
                'directories': directory_stats
            }
            
        except Exception as e:
            print(f"Error getting collection stats: {e}")
            return {'total_embeddings': 0, 'directories': []}
    
    def clear_collection(self) -> None:
        """Clear all embeddings (use with caution)"""
        try:
            # Delete and recreate collection
            self.chroma_client.delete_collection("qlippy_documents")
            self._init_collection()
            
            # Clear SQLite metadata
            self.conn.execute("DELETE FROM embedding_metadata")
            self.conn.commit()
            
            print("Embedding collection cleared")
            
        except Exception as e:
            print(f"Error clearing collection: {e}")
            raise

# Create singleton instance
embedding_service = EmbeddingService() 