# RAG Index Clear Feature

## Overview

Added a comprehensive RAG (Retrieval-Augmented Generation) index clearing feature to the Clear Memory settings, allowing users to clear indexed files and embeddings alongside their chat history.

## Features Added

### 🗄️ **RAG Index Management**
- **Index Statistics Display**: Shows real-time statistics about indexed directories, files, chunks, and conversation contexts
- **Standalone Clear Option**: Dedicated button to clear RAG index independently
- **Integrated Clear Option**: Checkbox in the clear chats dialog to also clear RAG index
- **Smart UI**: Only shows RAG options when there is indexed data to clear

### 📊 **RAG Statistics**
- **Directories**: Number of active indexed directories
- **Files**: Indexed files vs total files found
- **Chunks**: Total number of text chunks in the vector database
- **Active Contexts**: Number of conversation-directory links

### 🔧 **Backend API Endpoints**

#### Get RAG Index Statistics
**Endpoint**: `GET /api/rag/index-stats`

**Response**:
```json
{
  "status": "success",
  "data": {
    "total_directories": 3,
    "total_files": 150,
    "indexed_files": 142,
    "total_chunks": 2847,
    "active_conversation_contexts": 5
  }
}
```

#### Clear RAG Index
**Endpoint**: `POST /api/rag/clear-index`

**What it clears**:
- All embeddings from the vector database (Chroma)
- File index metadata
- Merkle tree data
- Message-chunk associations
- Conversation-directory contexts
- Resets last indexed timestamps

**Response**:
```json
{
  "status": "success",
  "message": "RAG index cleared successfully"
}
```

## UI Components

### Enhanced Clear Memory Settings

The Clear Memory settings page now includes:

1. **Chat History Card** (existing, enhanced with icons)
   - Shows conversation count
   - Clear all conversations button

2. **RAG Index Card** (new)
   - Real-time statistics grid
   - Standalone clear button
   - Loading states and empty states

3. **Enhanced Clear Dialog** (updated)
   - Original conversation clearing
   - Optional RAG index checkbox (when data exists)
   - Detailed information about what will be cleared

### Smart UI Behavior

- **Loading States**: Shows spinner while loading RAG statistics
- **Empty States**: Displays "No indexed files found" when RAG is empty
- **Conditional Display**: RAG options only appear when there's data to clear
- **Real-time Updates**: Statistics refresh after clearing operations

## Implementation Details

### Backend Implementation

```python
@router.post("/clear-index")
async def clear_rag_index() -> Dict[str, Any]:
    """Clear all RAG index data"""
    # Clear embedding collection
    embedding_service.clear_collection()
    
    # Clear database tables
    file_indexer_service.conn.execute("DELETE FROM message_rag_chunks")
    file_indexer_service.conn.execute("DELETE FROM conversation_rag_context")
    file_indexer_service.conn.execute("DELETE FROM embedding_metadata")
    file_indexer_service.conn.execute("DELETE FROM file_index")
    file_indexer_service.conn.execute("DELETE FROM merkle_tree")
    file_indexer_service.conn.execute("UPDATE indexed_directories SET last_indexed_at = NULL")
```

### Frontend Integration

```typescript
// Load RAG statistics
const stats = await settingsApi.getRagIndexStats()

// Clear RAG index
await settingsApi.clearRagIndex()

// Integrated clearing with chat history
if (clearRagIndex && ragStats && ragStats.total_chunks > 0) {
  await settingsApi.clearRagIndex()
}
```

## User Experience

### Clear Chats Flow

1. **User clicks "Clear All Chats"**
2. **Dialog shows**:
   - Confirmation message about conversations
   - Checkbox for RAG index (if data exists)
   - Details about what will be cleared
3. **User can choose**:
   - Clear only conversations
   - Clear conversations + RAG index
4. **Operation executes**:
   - Conversations cleared first
   - RAG index cleared if selected
   - Success/error feedback provided
   - Statistics updated

### Standalone RAG Clear

1. **User sees RAG Index card** with current statistics
2. **User clicks "Clear RAG Index"** button
3. **Operation executes** immediately
4. **Statistics refresh** to show empty state

## Benefits

### For Users
- **Complete Data Control**: Can clear all indexed data when needed
- **Granular Options**: Choose what to clear (chats only vs chats + RAG)
- **Transparency**: See exactly what data exists and what will be cleared
- **Fresh Start**: Easy way to reset both conversations and file context

### For Developers
- **Clean Architecture**: Proper separation between chat and RAG clearing
- **Reusable APIs**: RAG clear endpoints can be used elsewhere
- **Error Handling**: Robust error handling with user feedback
- **Performance**: Efficient clearing of large datasets

## Use Cases

1. **Privacy Cleanup**: Remove all conversation and file context data
2. **Fresh Testing**: Clear all data for clean testing environments
3. **Storage Management**: Free up space by removing embeddings
4. **Context Reset**: Remove file associations when changing projects
5. **Troubleshooting**: Clear corrupted or problematic index data

## Technical Notes

- **Safe Operations**: Clearing preserves directory configurations (only clears indexed data)
- **Atomic Operations**: Database operations are wrapped in transactions
- **Error Recovery**: Failed operations don't leave partial state
- **Performance**: Optimized for large datasets with batch operations
- **Compatibility**: Works with existing RAG system without breaking changes 