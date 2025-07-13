"""
author: Derrick Johnson
date: 05/12/2025
todo:
    - replace print with logging
    - add comments
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, AsyncGenerator, List, Dict
import asyncio

# from model_loader import ModelLoader # No longer needed
# from gemma_model_inference import GemmaModelInference # No longer needed
from ollama_model_inference import OllamaModelInference, Message # Import Message type

# --- Globals for holding models ---
models = {}

# --- Logging Setup ---
logging.basicConfig(
    level=logging.INFO,
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# --- Model Loading on Startup ---
def load_inference_model():
    """Loads the Ollama model and stores it in the global 'models' dict."""
    logger.info("Loading Ollama model...")
    try:
        # This should match the model you have downloaded with `ollama pull`
        model_name = "llama3.1:8b" 
        
        iInfer = OllamaModelInference(model_name=model_name)

        models['ollama'] = iInfer
        logger.info(f"Ollama model '{model_name}' loaded successfully.")
    except Exception as e:
        logger.error(f"FATAL: Could not load Ollama model on startup: {e}")
        # In a real app, you might want to exit if the model fails to load.
        # For now, we'll log the error and the app will start, but endpoints will fail.
        models['ollama'] = None


# --- FastAPI Lifespan Management ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the model during startup
    load_inference_model()
    yield
    # Clean up resources if needed on shutdown
    models.clear()
    logger.info("Models cleared, server shutting down.")


# --- FastAPI App Initialization ---
app = FastAPI(lifespan=lifespan)

# --- CORS Configuration ---
# This allows the Next.js frontend (running on http://localhost:3000)
# to communicate with this Python server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# --- Pydantic Request Models ---
class GenerateRequest(BaseModel):
    query: str # The most recent user query
    messages: Optional[List[Message]] = None # The entire conversation history
    persona: Optional[str] = None
    max_tokens: int = 4096
    temperature: float = 0.6
    top_k: int = 10
    # repetition_penalty is not used by the new Ollama implementation.

# --- API Endpoints ---
@app.get("/health")
def health_check():
    """A simple endpoint to confirm the server is running."""
    return {"status": "ok", "ollama_model_loaded": models.get('ollama') is not None}

@app.post("/api/generate")
async def generate_text(request: GenerateRequest):
    """
    Generates text using the pre-loaded Ollama model and streams the response.
    """
    logger.info(f"Received generation request with query: '{request.query}'")
    
    inference_instance = models.get('ollama')

    if inference_instance is None:
        logger.error("Ollama model is not available. Cannot process request.")
        raise HTTPException(status_code=503, detail="Model is not loaded. Please check server logs.")

    async def stream_generation() -> AsyncGenerator[str, None]:
        try:
            # The run_inference method is a generator
            for chunk in inference_instance.run_inference(
                query=request.query,
                messages=request.messages,
                top_k=request.top_k,
                temperature=request.temperature,
                persona=request.persona,
                max_tokens=request.max_tokens,
            ):
                yield chunk
                await asyncio.sleep(0) # Yield control to the event loop
        except Exception as e:
            logger.exception(f"An error occurred during inference streaming: {e}")
            # This part of the error won't be sent to the client as the headers are already sent.
            # It's important for server-side logging.
            
    return StreamingResponse(stream_generation(), media_type="text/plain")

# --- Main entry point for running the server with uvicorn ---
if __name__ == "__main__":
    import uvicorn
    # To run this server, execute the following command in your terminal:
    # uvicorn main:app --reload --port 8000
    # Note: Ensure you are in the qnn_sample_apps/src/llm/ directory.
    uvicorn.run(app, host="0.0.0.0", port=8000)