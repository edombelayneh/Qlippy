#!/usr/bin/env python3
"""
Quick Test Server - Bypasses heavy model loading for immediate testing
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
import tempfile
import subprocess
import wave
import numpy as np
import uvicorn

app = FastAPI(title="Qlippy Test API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "services": {
            "audio": "ok",
            "transcription": "mock",
            "llm": "mock",
            "tts": "ok"
        }
    }

@app.post("/api/generate")
async def generate(request: Request):
    try:
        data = await request.json()
        prompt = data.get("prompt", "")
        print(f"📝 Received LLM prompt: {prompt}")
        
        # Mock streaming response
        async def mock_stream():
            response_text = f"✅ Mock LLM Response: I received your message '{prompt}'. The server is working correctly!"
            for word in response_text.split():
                yield json.dumps({"token": word + " "}) + "\n"
                await asyncio.sleep(0.1)
        
        return StreamingResponse(
            mock_stream(),
            media_type="text/event-stream"
        )
        
    except Exception as e:
        print(f"❌ LLM Error: {e}")
        return StreamingResponse(
            iter([f'{{"error": "{str(e)}"}}\n']),
            media_type="text/event-stream"
        )

@app.websocket("/ws/record")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    temp_path = None
    
    try:
        print("🎙️ WebSocket connection established")
        
        # Start mock recording
        temp_file = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        temp_path = temp_file.name
        temp_file.close()
        
        await websocket.send_json({
            "status": "recording",
            "message": "Recording started"
        })
        
        # Wait for stop signal
        while True:
            try:
                data = await websocket.receive_text()
                if data == "stop":
                    break
            except WebSocketDisconnect:
                break
        
        await websocket.send_json({
            "status": "processing",
            "message": "Processing audio..."
        })
        
        # Mock audio validation with lower threshold
        mock_amplitude = 50  # This should pass the new threshold of 10
        
        if mock_amplitude >= 10:  # New threshold
            # Mock successful transcription
            await websocket.send_json({
                "status": "success",
                "message": "Transcription complete",
                "transcription": "✅ Test transcription successful! Audio validation is working.",
                "metrics": {
                    "max_amplitude": mock_amplitude,
                    "mean_amplitude": 25,
                    "duration": 2.5
                }
            })
        else:
            await websocket.send_json({
                "status": "error",
                "message": "Audio too quiet - please speak louder"
            })
            
    except Exception as e:
        print(f"🎙️ WebSocket Error: {e}")
        await websocket.send_json({
            "status": "error",
            "message": f"Server error: {str(e)}"
        })
    
    finally:
        if temp_path:
            try:
                import os
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
            except:
                pass

if __name__ == "__main__":
    print("🚀 Starting Qlippy Test Server...")
    print("📡 Server URL: http://127.0.0.1:11434")
    print("🔧 This is a test server that mocks LLM and Whisper responses")
    print("✅ Use this to test your frontend while the full server loads")
    print("=" * 60)
    
    uvicorn.run(app, host="127.0.0.1", port=11434) 