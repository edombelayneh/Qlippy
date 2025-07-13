#!/usr/bin/env python3
"""
Qlippy Backend Server Startup Script
Easy way to start the backend with proper error handling
"""

import os
import sys
import subprocess
import asyncio
from pathlib import Path
import sqlite3

# Add the parent directory to Python path for imports
sys.path.insert(0, str(Path(__file__).parent))

def check_requirements():
    """Check if all requirements are met"""
    issues = []
    
    # Check if we're in virtual environment
    if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        issues.append("❌ Virtual environment not activated. Run: source ../../.env/bin/activate")
    
    # Check if database schema exists
    schema_path = Path("qlippy_mvp_schema.sql")
    if not schema_path.exists():
        issues.append(f"❌ Database schema not found at {schema_path}")
    
    # Check if Whisper model exists
    whisper_path = Path("models/whisper-base")
    if not whisper_path.exists():
        issues.append(f"❌ Whisper model not found at {whisper_path}")
    
    return issues

def check_database_models():
    """Check if there are models in the database"""
    try:
        # Import here to avoid issues before database is set up
        from services.settings_service import settings_service
        models = settings_service.get_models()
        
        if not models:
            print("⚠️  No models found in database.")
            print("   You can add models through the web interface at Settings → Models")
            return False
        
        active_models = [m for m in models if m.get('is_active', False)]
        if not active_models:
            print(f"⚠️  {len(models)} model(s) found in database, but none are active.")
            print("   A model will be automatically selected on first use.")
        else:
            print(f"✅ {len(models)} model(s) found in database, {len(active_models)} active.")
        
        # Verify model files exist
        for model in models:
            model_path = Path(model['file_path'])
            if not model_path.exists():
                # Try relative to project root
                model_path = Path.cwd().parent / model['file_path']
                if not model_path.exists():
                    print(f"⚠️  Model file not found: {model['file_path']} (Model: {model['name']})")
                else:
                    print(f"✅ Model file verified: {model['name']}")
            else:
                print(f"✅ Model file verified: {model['name']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking database models: {e}")
        return False

async def preload_active_model():
    """Preload the active model to avoid loading delays"""
    try:
        print("🔄 Preloading active model...")
        from services.llm_service import llm_service
        
        # Try to load the active model
        success = await llm_service.load_active_model()
        if success:
            print("✅ Active model preloaded successfully!")
        else:
            print("⚠️  No active model to preload. Models will be loaded on demand.")
        
    except Exception as e:
        print(f"⚠️  Error preloading model: {e}")
        print("   Models will be loaded on demand.")

def check_models_in_db():
    """Check if any models are configured in the database"""
    db_path = "qlippy.db"
    
    if not Path(db_path).exists():
        print("⚠️  Database not found. It will be created on first run.")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.execute("SELECT COUNT(*) FROM models WHERE is_active = 1")
        active_count = cursor.fetchone()[0]
        
        cursor = conn.execute("SELECT name, file_path FROM models WHERE is_active = 1")
        active_models = cursor.fetchall()
        
        conn.close()
        
        if active_count == 0:
            print("⚠️  No active models found in database.")
            print("   Please add and activate a model through the web interface.")
            return False
        
        # Check if model files exist
        for name, file_path in active_models:
            if not Path(file_path).exists():
                # Try relative path
                relative_path = Path("llm") / Path(file_path).name
                if relative_path.exists():
                    print(f"✅ Found model: {name} at {relative_path}")
                else:
                    print(f"❌ Model file not found: {file_path}")
                    print(f"   Also checked: {relative_path}")
                    return False
            else:
                print(f"✅ Found model: {name} at {file_path}")
        
        return True
        
    except sqlite3.OperationalError as e:
        print(f"⚠️  Database error: {e}")
        return False

def main():
    """Main startup function"""
    print("🚀 Starting Qlippy Backend Server...")
    print("=" * 50)
    
    # Check requirements
    issues = check_requirements()
    if issues:
        print("❌ STARTUP ISSUES FOUND:")
        for issue in issues:
            print(f"  {issue}")
        print("\n📋 Please fix the issues above and try again.")
        sys.exit(1)
    
    print("✅ All requirements check passed!")
    
    # Check database models
    print("\n🔍 Checking available models...")
    check_database_models()
    
    # Preload active model
    print("\n🤖 Preparing AI models...")
    try:
        asyncio.run(preload_active_model())
    except Exception as e:
        print(f"⚠️  Model preloading failed: {e}")
        print("   Continuing startup - models will load on demand.")
    
    # Check if models are available
    check_models_in_db()
    
    # Import here to avoid issues if dependencies aren't installed
    try:
        import uvicorn
        from services.llm_service import llm_service
        from main import app
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("   Run: pip install -r requirements.txt")
        sys.exit(1)
    
    # Pre-load the active model if available
    print("🔄 Attempting to pre-load active model...")
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    async def preload():
        success = await llm_service.load_active_model()
        if success:
            print("✅ Model pre-loaded successfully!")
        else:
            print("⚠️  No model pre-loaded. You can load one from the web interface.")
    
    loop.run_until_complete(preload())
    loop.close()
    
    # Start the server with optimized settings
    print(f"✅ Server starting on http://127.0.0.1:11434")
    print("   Press CTRL+C to stop")
    
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=11434,
        # Optimize for streaming
        access_log=False,  # Disable access logs for better performance
        loop="uvloop",     # Use uvloop for better performance (will fallback if not available)
        # Increase limits for better streaming
        limit_concurrency=1000,
        limit_max_requests=10000,
        timeout_keep_alive=30,
        # Use a single worker for development to ensure model stays loaded
        workers=1,
    )

if __name__ == "__main__":
    main() 