# Enhanced Generate Endpoint with Memory and RAG

## Overview

The basic `/api/generate` endpoint has been enhanced with comprehensive memory and RAG (Retrieval-Augmented Generation) capabilities, bringing it to feature parity with the LangGraph endpoint for non-tool-calling scenarios.

## Features Added

### 🧠 **Enhanced Memory Management**
- **Conversation History Retrieval**: Automatically fetches the last 10 messages from the conversation database
- **Context-Aware Prompting**: Builds comprehensive prompts with conversation history, system prompts, and RAG context
- **Smart Context Formatting**: Properly formats conversation history with role labels (Human/Assistant/System)

### 📚 **RAG Integration**
- **Automatic Context Retrieval**: Fetches relevant file chunks when a conversation has RAG contexts configured
- **Context Length Management**: Limits RAG context to 4000 characters to reserve space for conversation history
- **Source Tracking**: Provides metadata about which files and chunks were used for context

### 🔧 **Enhanced Prompt Engineering**
- **Structured Prompting**: Builds prompts with clear sections for system instructions, RAG context, and conversation history
- **Context Prioritization**: Balances system prompts, RAG context, and conversation history for optimal responses
- **Metadata Streaming**: Streams context information to the frontend for transparency

## API Enhancements

### Enhanced Generate Endpoint

**Endpoint**: `POST /api/generate`

**Request Body**:
```json
{
  "prompt": "Your question here",
  "conversation_id": "uuid-here",
  "use_enhanced_memory": true
}
```

**Response Stream**:
```json
{"type": "context_info", "rag_chunks": 2, "conversation_history": 5, "sources": ["file1.py", "file2.md"]}
{"token": "Based on the conversation history and the files you've shared..."}
{"token": " I can help you with that."}
{"done": true}
```

### Message Saving Endpoint

**Endpoint**: `POST /api/save-message`

**Request Body**:
```json
{
  "conversation_id": "uuid-here",
  "role": "user|assistant|system",
  "content": "Message content"
}
```

## Implementation Details

### Enhanced Stream Generator

The `enhanced_stream_generator` function:

1. **Retrieves Conversation History**: Fetches the last 10 messages from the database
2. **Fetches RAG Context**: Queries the RAG system for relevant file chunks
3. **Builds Enhanced Prompt**: Combines system prompt, RAG context, and conversation history
4. **Streams Context Info**: Sends metadata about the context used
5. **Streams Response**: Uses the LLM service with `skip_rag=True` to avoid double-processing

### Prompt Structure

The enhanced prompt follows this structure:

```
[System Prompt]
You are Qlippy, a helpful AI assistant...

[File/Document Context (RAG)]
Relevant file/document content and metadata retrieved for this query:
---
Source: file1.py (chunk 1)
Content here...
---

[Conversation History]
Previous conversation context:
Human: Previous question
Assistant: Previous response

[Current Query]
Human: Current question

## Benefits

### For Users
- **Better Context Awareness**: AI remembers previous conversation context
- **Smarter Responses**: Relevant files and documents are automatically referenced
- **Transparency**: Users can see what context was used for each response
- **Consistent Experience**: Both tool-calling and non-tool-calling models have rich context

### For Developers
- **Unified Architecture**: Both endpoints now have similar capabilities
- **Maintainable Code**: Clean separation between basic and enhanced functionality
- **Flexible Configuration**: Can enable/disable enhanced memory per request
- **Extensible Design**: Easy to add more context types in the future

## Configuration

### Frontend Integration

The frontend automatically uses enhanced memory by default:

```typescript
const requestBody = {
  prompt,
  conversation_id: conversationId,
  use_enhanced_memory: true // Enabled by default
};
```

### Backend Configuration

The enhanced generator can be toggled:

```python
# Use enhanced memory (default)
generator = enhanced_stream_generator(prompt, conversation_id)

# Use basic functionality
generator = stream_generator(prompt, conversation_id)
```

## Migration Notes

- **Backward Compatibility**: The original `/api/generate` endpoint still works without changes
- **Opt-in Enhancement**: Enhanced memory is enabled by default but can be disabled
- **Database Requirements**: Requires conversation and message tables to be properly set up
- **RAG Dependencies**: RAG features require the RAG system to be configured

## Future Enhancements

- **Context Caching**: Cache conversation summaries for very long conversations
- **Adaptive Context**: Dynamically adjust context length based on model capabilities
- **Multi-modal Context**: Support for image and file context in conversations
- **Context Compression**: Intelligent summarization of long conversation histories 