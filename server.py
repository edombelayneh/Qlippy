from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from llama_cpp import Llama
import uvicorn
import os
from fastapi.responses import StreamingResponse
import json
import asyncio
import pyttsx3
from pydantic import BaseModel
import threading
import time

class SpeakRequest(BaseModel):
    text: str
    stop: bool = False

# Global variable to track if we're currently speaking
is_speaking = False
current_speech_thread = None
current_engine = None

def create_engine():
    """Create a fresh TTS engine instance"""
    engine = pyttsx3.init()
    engine.setProperty('rate', 150)  # Speed of speech
    engine.setProperty('volume', 0.9)  # Volume level
    return engine

model_path = os.path.join(os.path.dirname(__file__), "llm","mistral-7b-instruct-v0.2.Q4_K_M.gguf")
llm = Llama(model_path=model_path, n_ctx=2048)

app = FastAPI()

# Add CORS for local requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def estimate_token_count(text):
    return len(text.split()) * 0.75

def smart_max_tokens(prompt, total_ctx=2048, min_out=64, max_out=512):
    prompt_tokens = estimate_token_count(prompt)
    available = total_ctx - int(prompt_tokens)
    return max(min(available, max_out), min_out)

async def generate_stream(prompt: str):
    try:
        stream = llm(
            prompt,
            max_tokens=1024,
            stream=True,
            temperature=0.7,
        )
        
        for output in stream:
            chunk = output["choices"][0]["text"]
            if chunk:
                yield json.dumps({"token": chunk}) + "\n"
                await asyncio.sleep(0)  # Allow other tasks to run
                
    except Exception as e:
        yield json.dumps({"error": str(e)}) + "\n"

@app.post("/generate")
async def generate(req: Request):
    try:
        data = await req.json()
        prompt = data.get("prompt", "")
        print(f"Received prompt: {prompt}")
        
        return StreamingResponse(
            generate_stream(prompt),
            media_type="text/event-stream"
        )
        
    except Exception as e:
        print(f"Error in generate: {e}")
        return StreamingResponse(
            iter([json.dumps({"error": str(e)}) + "\n"]),
            media_type="text/event-stream"
        )

@app.post("/speak")
async def speak(request: SpeakRequest):
    global is_speaking, current_speech_thread, current_engine
    
    try:
        if request.stop:
            if is_speaking:
                # Stop the current speech
                is_speaking = False
                if current_engine:
                    try:
                        current_engine.stop()
                        print("Engine stopped")
                    except Exception as e:
                        print(f"Error stopping engine: {e}")
                if current_speech_thread and current_speech_thread.is_alive():
                    current_speech_thread.join(timeout=1.0)
                current_engine = None
                print("Speech stopped")
            return {"status": "stopped"}
            
        # If already speaking, stop first
        if is_speaking:
            is_speaking = False
            if current_engine:
                try:
                    current_engine.stop()
                except:
                    pass
            if current_speech_thread and current_speech_thread.is_alive():
                current_speech_thread.join(timeout=1.0)
            current_engine = None
            
        # Run TTS in a separate thread to not block
        def speak_text():
            global is_speaking, current_engine
            # Create a fresh engine instance for each speech request
            local_engine = create_engine()
            current_engine = local_engine  # Store globally so we can stop it
            
            try:
                is_speaking = True
                print(f"Starting to speak: {request.text[:50]}...")
                local_engine.say(request.text)
                local_engine.runAndWait()
                
                if is_speaking:
                    print("Speech completed")
                else:
                    print("Speech was stopped")
                    
            except Exception as e:
                print(f"Error in speak_text: {e}")
            finally:
                is_speaking = False
                current_engine = None
                # Clean up the local engine
                try:
                    local_engine.stop()
                except:
                    pass
        
        # Create and start the speech thread
        current_speech_thread = threading.Thread(target=speak_text)
        current_speech_thread.start()
        
        # Return immediately after starting speech
        return {"status": "started"}
        
    except Exception as e:
        print(f"Error in speak: {e}")
        is_speaking = False
        current_engine = None
        return {"status": "error", "message": str(e)}

@app.get("/speak/status")
async def get_speech_status():
    """Get the current speech status"""
    return {"is_speaking": is_speaking}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=11434)

