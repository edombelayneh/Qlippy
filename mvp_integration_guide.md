# 🚀 5-Hour MVP Integration Guide

## 🎯 Quick Start (30 minutes)

### 1. Setup Database
```bash
# 1. Copy files to your project
cp qlippy_mvp_schema.sql packages/server/
cp quick_db_integration.py packages/server/

# 2. Install dependencies
pip install sqlite3  # Usually included with Python

# 3. Initialize database
cd packages/server
python quick_db_integration.py
```

### 2. Add to FastAPI (packages/server/main.py)
```python
from quick_db_integration import get_db_instance

# Add at the top of main.py
db = get_db_instance("qlippy.db")
```

## 🔧 Core API Endpoints (2 hours)

### Add to packages/server/api/routes/settings.py

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
from quick_db_integration import get_db_instance

router = APIRouter()
db = get_db_instance()

# =============================================================================
# THEME SETTINGS
# =============================================================================

class ThemeSettings(BaseModel):
    theme: str

@router.get("/theme")
async def get_theme_settings():
    """Get theme settings for AppearanceSettings component"""
    return db.get_theme_settings()

@router.post("/theme")
async def update_theme_settings(settings: ThemeSettings):
    """Update theme settings"""
    db.update_theme_settings(settings.theme)
    return {"status": "success"}

# =============================================================================
# TTS SETTINGS
# =============================================================================

class TTSSettings(BaseModel):
    selectedVoice: str
    playbackSpeed: float
    testText: str

@router.get("/tts")
async def get_tts_settings():
    """Get TTS settings for TextToSpeechSettings component"""
    return db.get_tts_settings()

@router.post("/tts")
async def update_tts_settings(settings: TTSSettings):
    """Update TTS settings"""
    db.update_tts_settings(
        settings.selectedVoice, 
        settings.playbackSpeed, 
        settings.testText
    )
    return {"status": "success"}

# =============================================================================
# MODEL BEHAVIOR
# =============================================================================

class ModelBehaviorSettings(BaseModel):
    temperature: float
    top_p: float
    top_k: int
    max_tokens: int
    stop_sequences: List[str]
    system_prompt: str

@router.get("/model-behavior")
async def get_model_behavior():
    """Get model behavior settings for ModelBehaviorSettings component"""
    return db.get_model_behavior()

@router.post("/model-behavior")
async def update_model_behavior(settings: ModelBehaviorSettings):
    """Update model behavior settings"""
    db.update_model_behavior(
        settings.temperature,
        settings.top_p,
        settings.top_k,
        settings.max_tokens,
        settings.stop_sequences,
        settings.system_prompt
    )
    return {"status": "success"}

# =============================================================================
# MODELS
# =============================================================================

class AddModelRequest(BaseModel):
    name: str
    file_path: str
    file_size_display: str

@router.get("/models")
async def get_models():
    """Get all models for ManageModelsSettings component"""
    return db.get_models()

@router.post("/models")
async def add_model(request: AddModelRequest):
    """Add new model"""
    model_id = db.add_model(request.name, request.file_path, request.file_size_display)
    return {"status": "success", "id": model_id}

@router.delete("/models/{model_id}")
async def delete_model(model_id: str):
    """Delete model"""
    db.delete_model(model_id)
    return {"status": "success"}

@router.post("/models/{model_id}/activate")
async def set_active_model(model_id: str):
    """Set active model"""
    db.set_active_model(model_id)
    return {"status": "success"}

# =============================================================================
# RULES
# =============================================================================

class AddRuleRequest(BaseModel):
    description: str

@router.get("/rules")
async def get_rules():
    """Get all rules for RulesSettings component"""
    return db.get_rules()

@router.post("/rules")
async def add_rule(request: AddRuleRequest):
    """Add new rule"""
    rule_id = db.add_rule(request.description)
    return {"status": "success", "id": rule_id}

@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str):
    """Delete rule"""
    db.delete_rule(rule_id)
    return {"status": "success"}

@router.post("/rules/{rule_id}/toggle")
async def toggle_rule(rule_id: str, enabled: bool):
    """Toggle rule enabled state"""
    db.toggle_rule(rule_id, enabled)
    return {"status": "success"}

# =============================================================================
# CONVERSATIONS
# =============================================================================

class CreateConversationRequest(BaseModel):
    title: str

class AddMessageRequest(BaseModel):
    role: str
    content: str

@router.get("/conversations")
async def get_conversations():
    """Get all conversations for chat history"""
    return db.get_conversations()

@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: str):
    """Get messages for a conversation"""
    return db.get_conversation_messages(conversation_id)

@router.post("/conversations")
async def create_conversation(request: CreateConversationRequest):
    """Create new conversation"""
    conversation_id = db.create_conversation(request.title)
    return {"status": "success", "id": conversation_id}

@router.post("/conversations/{conversation_id}/messages")
async def add_message(conversation_id: str, request: AddMessageRequest):
    """Add message to conversation"""
    message_id = db.add_message(conversation_id, request.role, request.content)
    return {"status": "success", "id": message_id}

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete conversation"""
    db.delete_conversation(conversation_id)
    return {"status": "success"}

# =============================================================================
# VOICE DETECTION
# =============================================================================

class VoiceDetectionSettings(BaseModel):
    wake_word: str
    file_path: str
    enabled: bool

@router.get("/voice-detection")
async def get_voice_detection_settings():
    """Get voice detection settings"""
    return db.get_voice_detection_settings()

@router.post("/voice-detection")
async def update_voice_detection_settings(settings: VoiceDetectionSettings):
    """Update voice detection settings"""
    db.update_voice_detection_settings(
        settings.wake_word, 
        settings.file_path, 
        settings.enabled
    )
    return {"status": "success"}

# =============================================================================
# AUDIO SETTINGS
# =============================================================================

class AudioSettings(BaseModel):
    speaker_volume: float
    mic_volume: float
    selected_speaker: str
    selected_microphone: str

@router.get("/audio")
async def get_audio_settings():
    """Get audio settings"""
    return db.get_audio_settings()

@router.post("/audio")
async def update_audio_settings(settings: AudioSettings):
    """Update audio settings"""
    db.update_audio_settings(
        settings.speaker_volume,
        settings.mic_volume,
        settings.selected_speaker,
        settings.selected_microphone
    )
    return {"status": "success"}
```

### Update packages/server/main.py
```python
from fastapi import FastAPI
from api.middleware import setup_middleware
from api.routes import websocket, generate, speak, health, settings  # Add settings
from quick_db_integration import setup_database

# Create FastAPI app
app = FastAPI(title="Qlippy API", version="1.0.0")

# Setup database on startup
@app.on_event("startup")
async def startup_event():
    setup_database()

# Setup middleware
setup_middleware(app)

# Include routers
app.include_router(websocket.router, tags=["websocket"])
app.include_router(generate.router, prefix="/api", tags=["generate"])
app.include_router(speak.router, prefix="/api", tags=["speak"])
app.include_router(health.router, tags=["health"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])  # Add this
```

## 🖥️ Frontend Integration (1.5 hours)

### Update your hooks to use API instead of hardcoded values

### packages/web/app/hooks/use-settings.ts
```typescript
"use client"

import { useState, useEffect } from 'react'

// Add API functions
const API_BASE = 'http://localhost:8000/api/settings'

export function useThemeSettings() {
  const [settings, setSettings] = useState({ theme: 'system' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/theme`)
      const data = await response.json()
      setSettings(data)
    } catch (error) {
      console.error('Failed to fetch theme settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (theme: string) => {
    try {
      await fetch(`${API_BASE}/theme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme })
      })
      setSettings({ theme })
    } catch (error) {
      console.error('Failed to update theme settings:', error)
    }
  }

  return { settings, updateSettings, loading }
}

export function useTTSSettings() {
  const [settings, setSettings] = useState({
    selectedVoice: 'en-US-neural-aria',
    playbackSpeed: 1.0,
    testText: 'Hello! This is a test of the text-to-speech system.'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/tts`)
      const data = await response.json()
      setSettings(data)
    } catch (error) {
      console.error('Failed to fetch TTS settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (selectedVoice: string, playbackSpeed: number, testText: string) => {
    try {
      await fetch(`${API_BASE}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedVoice, playbackSpeed, testText })
      })
      setSettings({ selectedVoice, playbackSpeed, testText })
    } catch (error) {
      console.error('Failed to update TTS settings:', error)
    }
  }

  return { settings, updateSettings, loading }
}

export function useModelBehavior() {
  const [settings, setSettings] = useState({
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    max_tokens: 1024,
    stop_sequences: [],
    system_prompt: ''
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/model-behavior`)
      const data = await response.json()
      setSettings(data)
    } catch (error) {
      console.error('Failed to fetch model behavior:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (newSettings: typeof settings) => {
    try {
      await fetch(`${API_BASE}/model-behavior`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      })
      setSettings(newSettings)
    } catch (error) {
      console.error('Failed to update model behavior:', error)
    }
  }

  return { settings, updateSettings, loading }
}
```

### Update packages/web/app/hooks/use-chat.ts
```typescript
"use client"

import { useState, useEffect } from 'react'
import { Message, Conversation } from "@/lib/types"

const API_BASE = 'http://localhost:8000/api/settings'

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      const response = await fetch(`${API_BASE}/conversations`)
      const data = await response.json()
      setConversations(data)
      if (data.length > 0 && !activeConversationId) {
        setActiveConversationId(data[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const createNewConversation = async (title: string = "New Chat") => {
    try {
      const response = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      })
      const data = await response.json()
      
      if (data.status === 'success') {
        await fetchConversations()
        setActiveConversationId(data.id)
        return data.id
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
  }

  const addMessage = async (conversationId: string, role: string, content: string) => {
    try {
      const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content })
      })
      const data = await response.json()
      
      if (data.status === 'success') {
        await fetchConversations()
        return data.id
      }
    } catch (error) {
      console.error('Failed to add message:', error)
    }
  }

  const deleteConversation = async (conversationId: string) => {
    try {
      await fetch(`${API_BASE}/conversations/${conversationId}`, {
        method: 'DELETE'
      })
      await fetchConversations()
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    createNewConversation,
    addMessage,
    deleteConversation,
    loading
  }
}
```

## 🔄 Component Updates (1 hour)

### Update packages/web/components/settings/appearance-settings.tsx
```typescript
import { useThemeSettings } from "@/app/hooks/use-settings"

export function AppearanceSettings() {
  const { settings, updateSettings, loading } = useThemeSettings()

  if (loading) {
    return <div>Loading...</div>
  }

  const handleThemeChange = (theme: string) => {
    updateSettings(theme)
  }

  return (
    <div className="space-y-6">
      {/* Your existing JSX, but replace hardcoded values with settings */}
      <ThemeSwitcher 
        currentTheme={settings.theme} 
        onThemeChange={handleThemeChange}
      />
    </div>
  )
}
```

### Update packages/web/components/settings/text-to-speech-settings.tsx
```typescript
import { useTTSSettings } from "@/app/hooks/use-settings"

export function TextToSpeechSettings() {
  const { settings, updateSettings, loading } = useTTSSettings()

  if (loading) {
    return <div>Loading...</div>
  }

  const handleSave = () => {
    updateSettings(settings.selectedVoice, settings.playbackSpeed, settings.testText)
  }

  // Replace DEFAULT_SETTINGS with settings from hook
  // Update all handlers to use the hook
  
  return (
    // Your existing JSX
  )
}
```

## 🧪 Testing (30 minutes)

### Quick Test Script
```bash
# Test database
cd packages/server
python quick_db_integration.py

# Test API
python -m uvicorn main:app --reload --port 8000

# Test endpoints
curl http://localhost:8000/api/settings/theme
curl http://localhost:8000/api/settings/tts
curl http://localhost:8000/api/settings/model-behavior
```

## 📋 Final Checklist

### Backend (✅ Complete in 2.5 hours)
- [x] Database schema created
- [x] Python integration class
- [x] FastAPI endpoints
- [x] Database initialization

### Frontend (✅ Complete in 1.5 hours)
- [x] Replace hardcoded values with API calls
- [x] Update hooks to use database
- [x] Update components to use hooks
- [x] Test integration

### Testing (✅ Complete in 30 minutes)
- [x] Database operations working
- [x] API endpoints responding
- [x] Frontend loading settings
- [x] Settings persistence working

## 🎯 MVP Success Criteria

After 5 hours, you should have:

1. **Database** - SQLite database with all settings
2. **API** - FastAPI endpoints for all settings
3. **Frontend** - Components using database instead of hardcoded values
4. **Persistence** - Settings saved and loaded correctly
5. **Chat History** - Basic conversation persistence

## 🚀 Next Steps (Post-MVP)

1. Add model file synchronization
2. Implement wake word file management
3. Add more advanced features from full schema
4. Performance optimizations
5. Error handling improvements

This approach gets you a fully functional MVP with persistent settings in exactly 5 hours! 🎉 