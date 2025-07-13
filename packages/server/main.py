import uvicorn
from fastapi import FastAPI
from api.middleware import setup_middleware
from api.routes import generate, speak, websocket, settings, health, langgraph, conversations, models
from pathlib import Path
import sqlite3

# Initialize FastAPI app
app = FastAPI(title="Qlippy API", version="1.0.0")

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    db_path = "qlippy.db"
    schema_path = "qlippy_mvp_schema.sql"
    rag_schema_path = "rag_schema_update.sql"
    
    # Debug: List available audio devices
    try:
        import sounddevice as sd
        print("🎙️ Available audio devices:")
        devices = sd.query_devices()
        for i, device in enumerate(devices):
            device_type = "INPUT" if device['max_input_channels'] > 0 else "OUTPUT"
            print(f"  {i}: {device['name']} ({device_type}) - {device['max_input_channels']} in, {device['max_output_channels']} out")
    except Exception as e:
        print(f"⚠️ Could not list audio devices: {e}")
    
    # Check if database needs initialization
    needs_init = False
    if not Path(db_path).exists():
        needs_init = True
        print("Database file not found, will initialize...")
    else:
        # Check if database is empty or missing tables
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'")
            if cursor.fetchone() is None:
                needs_init = True
                print("Database exists but missing tables, will initialize...")
            conn.close()
        except Exception as e:
            needs_init = True
            print(f"Database check failed, will initialize: {e}")
    
    # Initialize database if needed
    if needs_init:
        if Path(schema_path).exists():
            print("Initializing database...")
            conn = sqlite3.connect(db_path)
            with open(schema_path, 'r') as f:
                conn.executescript(f.read())
            conn.close()
            print("Database initialized successfully!")
        else:
            print(f"Warning: Schema file {schema_path} not found")
    
    # Apply RAG schema updates
    if Path(rag_schema_path).exists():
        try:
            conn = sqlite3.connect(db_path)
            # Check if RAG tables already exist
            cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='rag_settings'")
            if cursor.fetchone() is None:
                print("Applying RAG schema updates...")
                with open(rag_schema_path, 'r') as f:
                    conn.executescript(f.read())
                print("RAG schema updates applied successfully!")
            conn.close()
        except Exception as e:
            print(f"Warning: Could not apply RAG schema updates: {e}")
    
    # Start background indexing task
    from services.rag_retriever_service import rag_retriever_service
    import asyncio
    asyncio.create_task(rag_retriever_service.start_background_indexing())
    print("📂 Background file indexing started")

# Setup middleware
setup_middleware(app)

# Include routers
app.include_router(websocket.router, tags=["websocket"])
app.include_router(generate.router, prefix="/api", tags=["generate"])
app.include_router(speak.router, prefix="/api", tags=["speak"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
app.include_router(models.router, prefix="/api/models", tags=["models"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(langgraph.router, prefix="/api/langgraph", tags=["langgraph"])
app.include_router(health.router, tags=["health"])

# Add RAG routes
from api.routes import rag
app.include_router(rag.router, prefix="/api/rag", tags=["rag"])

if __name__ == "__main__":
    from config.settings import settings
    
    # Run with optimized settings for streaming
    uvicorn.run(
        app, 
        host=settings.HOST, 
        port=settings.PORT,
        # Disable access log buffering for better streaming
        access_log=False,
        # Use uvloop for better async performance (if available)
        loop="auto",
    )