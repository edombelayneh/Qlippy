#!/usr/bin/env python3
"""
Qlippy MVP Setup Script
Automates database setup and file creation for 5-hour MVP development
"""

import os
import sys
import shutil
from pathlib import Path
from quick_db_integration import setup_database

def create_settings_route():
    """Create the settings.py route file"""
    settings_route = '''from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
from quick_db_integration import get_db_instance

router = APIRouter()
db = get_db_instance()

# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class ThemeSettings(BaseModel):
    theme: str

class TTSSettings(BaseModel):
    selectedVoice: str
    playbackSpeed: float
    testText: str

class ModelBehaviorSettings(BaseModel):
    temperature: float
    top_p: float
    top_k: int
    max_tokens: int
    stop_sequences: List[str]
    system_prompt: str

class AddModelRequest(BaseModel):
    name: str
    file_path: str
    file_size_display: str

class AddRuleRequest(BaseModel):
    description: str

class CreateConversationRequest(BaseModel):
    title: str

class AddMessageRequest(BaseModel):
    role: str
    content: str

class VoiceDetectionSettings(BaseModel):
    wake_word: str
    file_path: str
    enabled: bool

class AudioSettings(BaseModel):
    speaker_volume: float
    mic_volume: float
    selected_speaker: str = None
    selected_microphone: str = None

# =============================================================================
# THEME SETTINGS
# =============================================================================

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
'''
    
    return settings_route

def create_updated_main():
    """Create updated main.py with database integration"""
    main_content = '''from fastapi import FastAPI
from api.middleware import setup_middleware
from api.routes import websocket, generate, speak, health, settings
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
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])

if __name__ == "__main__":
    import uvicorn
    from config.settings import settings
    
    uvicorn.run(
        app, 
        host=settings.HOST, 
        port=settings.PORT
    )
'''
    return main_content

def create_frontend_hooks():
    """Create updated frontend hooks"""
    hooks_content = '''
"use client"

import { useState, useEffect } from 'react'
import { Message, Conversation } from "@/lib/types"

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

export function useConversations() {
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

// Additional hooks for other settings
export function useRules() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      const response = await fetch(`${API_BASE}/rules`)
      const data = await response.json()
      setRules(data)
    } catch (error) {
      console.error('Failed to fetch rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const addRule = async (description: string) => {
    try {
      const response = await fetch(`${API_BASE}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      })
      const data = await response.json()
      
      if (data.status === 'success') {
        await fetchRules()
        return data.id
      }
    } catch (error) {
      console.error('Failed to add rule:', error)
    }
  }

  const deleteRule = async (ruleId: string) => {
    try {
      await fetch(`${API_BASE}/rules/${ruleId}`, {
        method: 'DELETE'
      })
      await fetchRules()
    } catch (error) {
      console.error('Failed to delete rule:', error)
    }
  }

  return { rules, addRule, deleteRule, loading }
}

export function useModels() {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = async () => {
    try {
      const response = await fetch(`${API_BASE}/models`)
      const data = await response.json()
      setModels(data)
    } catch (error) {
      console.error('Failed to fetch models:', error)
    } finally {
      setLoading(false)
    }
  }

  const addModel = async (name: string, filePath: string, fileSizeDisplay: string) => {
    try {
      const response = await fetch(`${API_BASE}/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, file_path: filePath, file_size_display: fileSizeDisplay })
      })
      const data = await response.json()
      
      if (data.status === 'success') {
        await fetchModels()
        return data.id
      }
    } catch (error) {
      console.error('Failed to add model:', error)
    }
  }

  const deleteModel = async (modelId: string) => {
    try {
      await fetch(`${API_BASE}/models/${modelId}`, {
        method: 'DELETE'
      })
      await fetchModels()
    } catch (error) {
      console.error('Failed to delete model:', error)
    }
  }

  const setActiveModel = async (modelId: string) => {
    try {
      await fetch(`${API_BASE}/models/${modelId}/activate`, {
        method: 'POST'
      })
      await fetchModels()
    } catch (error) {
      console.error('Failed to activate model:', error)
    }
  }

  return { models, addModel, deleteModel, setActiveModel, loading }
}
'''
    return hooks_content

def main():
    """Main setup function"""
    print("🚀 Setting up Qlippy MVP Database Integration...")
    
    # Check if we're in the right directory
    if not Path("packages").exists():
        print("❌ Error: Run this script from the Qlippy root directory")
        sys.exit(1)
    
    # Create server directories
    server_dir = Path("packages/server")
    routes_dir = server_dir / "api" / "routes"
    routes_dir.mkdir(parents=True, exist_ok=True)
    
    # Create web directories
    web_dir = Path("packages/web")
    hooks_dir = web_dir / "app" / "hooks"
    hooks_dir.mkdir(parents=True, exist_ok=True)
    
    print("📁 Creating database schema...")
    # Copy schema file to server directory
    schema_target = server_dir / "qlippy_mvp_schema.sql"
    integration_target = server_dir / "quick_db_integration.py"
    
    if Path("qlippy_mvp_schema.sql").exists():
        shutil.copy2("qlippy_mvp_schema.sql", schema_target)
        print(f"✅ Database schema copied to {schema_target}")
    else:
        print("❌ qlippy_mvp_schema.sql not found")
    
    if Path("quick_db_integration.py").exists():
        shutil.copy2("quick_db_integration.py", integration_target)
        print(f"✅ Database integration copied to {integration_target}")
    else:
        print("❌ quick_db_integration.py not found")
    
    print("⚙️  Creating FastAPI routes...")
    # Create settings route
    settings_route_path = routes_dir / "settings.py"
    with open(settings_route_path, 'w') as f:
        f.write(create_settings_route())
    print(f"✅ Settings route created at {settings_route_path}")
    
    # Update main.py
    main_py_path = server_dir / "main.py"
    if main_py_path.exists():
        # Backup original
        shutil.copy2(main_py_path, main_py_path.with_suffix('.py.backup'))
        print(f"📋 Backed up original main.py to {main_py_path.with_suffix('.py.backup')}")
    
    with open(main_py_path, 'w') as f:
        f.write(create_updated_main())
    print(f"✅ Updated main.py at {main_py_path}")
    
    print("🎨 Creating frontend hooks...")
    # Create updated hooks
    hooks_path = hooks_dir / "use-settings-db.ts"
    with open(hooks_path, 'w') as f:
        f.write(create_frontend_hooks())
    print(f"✅ Database hooks created at {hooks_path}")
    
    print("🗃️  Setting up database...")
    # Initialize database
    try:
        os.chdir(server_dir)
        db = setup_database()
        print("✅ Database initialized successfully")
        
        # Test database
        print("🧪 Testing database operations...")
        theme_settings = db.get_theme_settings()
        tts_settings = db.get_tts_settings()
        model_behavior = db.get_model_behavior()
        conversations = db.get_conversations()
        
        print(f"✅ Theme settings: {theme_settings}")
        print(f"✅ TTS settings: {tts_settings}")
        print(f"✅ Model behavior: {model_behavior}")
        print(f"✅ Conversations: {len(conversations)} found")
        
        db.close()
        
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        sys.exit(1)
    
    print("\n🎉 MVP Setup Complete!")
    print("\n📋 Next Steps:")
    print("1. Start the backend server: cd packages/server && python -m uvicorn main:app --reload")
    print("2. Test API endpoints: curl http://localhost:8000/api/settings/theme")
    print("3. Update your frontend components to use the new hooks from use-settings-db.ts")
    print("4. Replace hardcoded values with database-backed settings")
    print("\n⏱️  Total setup time: ~15 minutes")
    print("🚀 You're ready to build your MVP!")

if __name__ == "__main__":
    main() 