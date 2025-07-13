#!/usr/bin/env python3
"""
Test RAG Integration
Demonstrates how to use the offline RAG system with Qlippy
"""

import asyncio
import json
from pathlib import Path

# Import services
from services.file_indexer_service import file_indexer_service
from services.embedding_service import embedding_service
from services.rag_retriever_service import rag_retriever_service
from services.settings_service import settings_service

async def test_rag_system():
    """Test the complete RAG workflow"""
    
    print("🧪 Testing Qlippy RAG System")
    print("=" * 50)
    
    # 1. Add a test directory to index
    test_dir = Path.home() / "Documents"  # Change this to your test directory
    
    if not test_dir.exists():
        print(f"❌ Test directory not found: {test_dir}")
        return
    
    print(f"\n1️⃣ Adding directory for indexing: {test_dir}")
    try:
        directory_id = file_indexer_service.add_indexed_directory(
            path=str(test_dir),
            file_patterns=["*.txt", "*.md", "*.py", "*.js"],
            exclude_patterns=["node_modules", ".git", "__pycache__"],
            index_frequency_minutes=60
        )
        print(f"✅ Directory added with ID: {directory_id}")
    except ValueError as e:
        # Directory might already exist
        print(f"⚠️ {e}")
        directories = file_indexer_service.get_indexed_directories()
        directory_id = directories[0]['id'] if directories else None
        if not directory_id:
            return
    
    # 2. Scan directory for files
    print(f"\n2️⃣ Scanning directory for changes...")
    changes = await file_indexer_service.detect_changes(directory_id)
    print(f"📊 Found:")
    print(f"   - New files: {len(changes['new'])}")
    print(f"   - Modified files: {len(changes['modified'])}")
    print(f"   - Deleted files: {len(changes['deleted'])}")
    print(f"   - Unchanged files: {len(changes['unchanged'])}")
    
    # 3. Index the directory
    print(f"\n3️⃣ Indexing directory (this may take a while)...")
    
    def progress_callback(data):
        if data['status'] == 'indexing':
            print(f"   📄 Indexing: {data['current_file']}")
    
    stats = await rag_retriever_service.index_directory_with_progress(
        directory_id,
        progress_callback=lambda x: print(f"   {x['message']}")
    )
    
    print(f"\n✅ Indexing complete!")
    print(f"   - Files indexed: {stats['indexed_files']}")
    print(f"   - Total chunks: {stats['total_chunks']}")
    if stats['errors']:
        print(f"   - Errors: {len(stats['errors'])}")
    
    # 4. Create a test conversation
    print(f"\n4️⃣ Creating test conversation...")
    conversation_id = "test-conversation-123"
    
    # Add directory context to conversation
    context_id = rag_retriever_service.add_conversation_context(
        conversation_id=conversation_id,
        directory_id=directory_id
    )
    print(f"✅ Added directory context to conversation")
    
    # 5. Test retrieval
    print(f"\n5️⃣ Testing retrieval...")
    test_queries = [
        "What Python files are in the directory?",
        "Show me markdown documentation",
        "What JavaScript code exists?"
    ]
    
    for query in test_queries:
        print(f"\n❓ Query: {query}")
        
        # Retrieve context
        context, chunks = await rag_retriever_service.retrieve_and_format_context(
            query=query,
            conversation_id=conversation_id,
            max_context_length=2000
        )
        
        if chunks:
            print(f"✅ Found {len(chunks)} relevant chunks:")
            for i, chunk in enumerate(chunks[:3]):  # Show first 3
                print(f"   {i+1}. {chunk['file_path']} (score: {chunk['relevance_score']:.3f})")
        else:
            print("❌ No relevant chunks found")
    
    # 6. Test with LLM integration
    print(f"\n6️⃣ Testing LLM integration with RAG...")
    
    # Import LLM service
    from services.llm_service import llm_service
    
    # Check if model is loaded
    if not llm_service.model:
        print("⚠️ Loading LLM model...")
        success = await llm_service.load_active_model()
        if not success:
            print("❌ Failed to load LLM model")
            return
    
    # Generate response with RAG context
    test_prompt = "Summarize the Python files in my documents"
    print(f"\n💬 Prompt: {test_prompt}")
    print("🤖 Generating response with RAG context...")
    
    response_parts = []
    async for chunk in llm_service.generate_stream(test_prompt, conversation_id):
        try:
            chunk_data = json.loads(chunk)
            if "token" in chunk_data:
                response_parts.append(chunk_data["token"])
                print(chunk_data["token"], end="", flush=True)
            elif "done" in chunk_data:
                break
        except json.JSONDecodeError:
            continue
    
    print("\n\n✅ RAG test complete!")
    
    # 7. Show statistics
    print(f"\n7️⃣ RAG System Statistics:")
    stats = embedding_service.get_collection_stats()
    print(f"   - Total embeddings: {stats['total_embeddings']}")
    for dir_stat in stats['directories']:
        print(f"   - {dir_stat['path']}: {dir_stat['file_count']} files, {dir_stat['chunk_count']} chunks")

async def main():
    """Main test function"""
    try:
        await test_rag_system()
    except KeyboardInterrupt:
        print("\n\n⚠️ Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 Qlippy RAG Integration Test")
    print("This will index files from your Documents folder and test retrieval")
    print("Press Ctrl+C to cancel at any time\n")
    
    asyncio.run(main()) 