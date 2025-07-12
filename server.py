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

class SpeakRequest(BaseModel):
    text: str
    stop: bool = False

# Initialize the TTS engine
engine = pyttsx3.init()

model_path = os.path.join(os.path.dirname(__file__), "phi-2.Q4_K_M.gguf")
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
    try:
        if request.stop:
            engine.stop()
            return {"status": "stopped"}
            
        # Run TTS in a separate thread to not block
        def speak_text():
            engine.say(request.text)
            engine.runAndWait()
        
        # Run in thread pool
        await asyncio.get_event_loop().run_in_executor(None, speak_text)
        return {"status": "success"}
        
    except Exception as e:
        print(f"Error in speak: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=11434)

