import asyncio
import json
from typing import AsyncGenerator, Optional
from pathlib import Path
from llama_cpp import Llama
from config.settings import settings
from utils.token_utils import estimate_token_count, smart_max_tokens
from services.settings_service import SettingsService

class LLMService:
    def __init__(self):
        self.model: Optional[Llama] = None
        self.current_model_id: Optional[str] = None
        self.is_loading: bool = False
        self.loading_progress: str = ""
        
    def get_active_model_from_db(self) -> Optional[dict]:
        """Get the active model from database"""
        try:
            # Import here to avoid circular imports
            from services.settings_service import settings_service
            models = settings_service.get_models()
            
            # Find the active model
            for model in models:
                if model.get('is_active', False):
                    return model
            
            # If no active model, return first available model
            if models:
                return models[0]
            
            return None
        except Exception as e:
            print(f"Error getting active model from database: {e}")
            return None
    
    async def load_active_model(self) -> bool:
        """Load the active model from database"""
        try:
            active_model = self.get_active_model_from_db()
            if not active_model:
                print("❌ No models found in database")
                return False
            
            return await self.load_model(active_model['id'], active_model['file_path'])
        except Exception as e:
            print(f"Error loading active model: {e}")
            return False
    
    async def load_model(self, model_id: str, model_path: str) -> bool:
        """Load a specific model by path"""
        if self.current_model_id == model_id and self.model is not None:
            print(f"Model {model_id} already loaded")
            return True
        
        try:
            self.is_loading = True
            self.loading_progress = "Initializing model loading..."
            print(f"🔄 Loading LLM model: {model_path}")
            
            # Validate model file exists
            model_file = Path(model_path)
            if not model_file.exists():
                # Try relative to project root
                model_file = Path.cwd().parent / model_path
                if not model_file.exists():
                    raise FileNotFoundError(f"Model file not found at {model_path}")
            
            self.loading_progress = "Loading model into memory..."
            
            # Unload current model if exists
            if self.model:
                print("🗑️ Unloading previous model...")
                del self.model
                self.model = None
            
            # Load new model
            self.model = Llama(
                model_path=str(model_file),
                n_ctx=settings.CONTEXT_WINDOW,
                n_batch=1,  # Process one token at a time for better streaming
                verbose=False  # Reduce verbose output
            )
            
            self.current_model_id = model_id
            self.loading_progress = "Model loaded successfully!"
            print(f"✅ LLM model loaded successfully: {model_file.name}")
            
            return True
            
        except Exception as e:
            self.loading_progress = f"Error loading model: {str(e)}"
            print(f"❌ Failed to load LLM model: {str(e)}")
            return False
        finally:
            self.is_loading = False
    
    def get_loading_status(self) -> dict:
        """Get current loading status"""
        return {
            "is_loading": self.is_loading,
            "progress": self.loading_progress,
            "current_model_id": self.current_model_id,
            "model_loaded": self.model is not None
        }

    async def generate_stream(self, prompt: str, conversation_id: Optional[str] = None, skip_rag: bool = False) -> AsyncGenerator[str, None]:
        """Generate streaming response from LLM with optional RAG context"""
        print(f"🔍 Starting generate_stream method")
        print(f"🔍 Model loaded: {self.model is not None}")
        print(f"🔍 Is loading: {self.is_loading}")
        
        if not self.model:
            # Try to load active model if none is loaded
            print("🔍 No model loaded, attempting to load active model...")
            if await self.load_active_model():
                print("✅ Successfully loaded active model for generation")
            else:
                yield json.dumps({"error": "No LLM model available. Please ensure a model is selected and loaded."}) + "\n"
                return
            
        if self.is_loading:
            yield json.dumps({"error": "Model is currently loading. Please wait..."}) + "\n"
            return
            
        try:
            print(f"🔍 Generating response for prompt: {prompt[:100]}...")
            
            # Get model behavior settings from database
            settings_service = SettingsService()
            model_behavior = settings_service.get_model_behavior()
            system_prompt = model_behavior.get("system_prompt", "")
            temperature = model_behavior.get("temperature", 0.7)
            max_tokens_setting = model_behavior.get("max_tokens", 1024)
            stop_sequences = model_behavior.get("stop_sequences", [])
            
            # Check if RAG context should be included (only if not skipped)
            rag_context = ""
            if conversation_id and not skip_rag:
                try:
                    from services.rag_retriever_service import rag_retriever_service
                    # Check if conversation has RAG contexts
                    contexts = rag_retriever_service.get_conversation_contexts(conversation_id)
                    if contexts:
                        # Retrieve relevant context
                        rag_context, chunks = await rag_retriever_service.retrieve_and_format_context(
                            query=prompt,
                            conversation_id=conversation_id,
                            max_context_length=3000  # Reserve space for prompt
                        )
                        if rag_context:
                            print(f"🔍 Added RAG context with {len(chunks)} chunks")
                except Exception as e:
                    print(f"⚠️ RAG context retrieval failed: {e}")
                    # Continue without RAG context
            
            # For enhanced generate, prompt is already formatted, so use as-is
            if skip_rag:
                full_prompt = prompt
            else:
                # Combine system prompt, RAG context, and user prompt (legacy behavior)
                full_prompt = system_prompt
                if rag_context:
                    full_prompt += f"\n\n{rag_context}"
                full_prompt += f"\n\nUser: {prompt}\n\nAssistant:"
            
            print(f"🔍 Full prompt length: {len(full_prompt)} characters")
            
            # Use database settings for max_tokens calculation
            max_tokens = smart_max_tokens(full_prompt, settings.CONTEXT_WINDOW, max_out=max_tokens_setting)
            print(f"🔍 Using max_tokens: {max_tokens} (from database: {max_tokens_setting})")
            
            # Prepare stop sequences from database + defaults
            default_stops = ["</s>", "<|endoftext|>", "\nUser:"]
            all_stops = default_stops + stop_sequences
            
            # Test yield to verify streaming works
            yield json.dumps({"token": ""}) + "\n"
            await asyncio.sleep(0)  # Force flush
            print("🔍 Test yield sent")
            
            stream = self.model(
                full_prompt,
                max_tokens=max_tokens,
                stream=True,
                temperature=temperature,  # Use database temperature
                stop=all_stops,  # Use database stop sequences + defaults
            )
            
            print("🔍 Stream created, starting to iterate...")
            token_count = 0
            
            for output in stream:
                try:
                    chunk = output["choices"][0]["text"]
                    if chunk:
                        token_count += 1
                        if token_count <= 5:  # Log first 5 tokens for debugging
                            print(f"🔍 Token {token_count}: {repr(chunk)}")
                        # Simple JSON format with newline
                        yield json.dumps({"token": chunk}) + "\n"
                        await asyncio.sleep(0)  # Force context switch for immediate flush
                except KeyError as e:
                    print(f"⚠️ Unexpected output format: {output}")
                    continue
            
            print(f"🔍 Streaming complete. Total tokens: {token_count}")
            # Send end-of-stream marker
            yield json.dumps({"done": True}) + "\n"
                    
        except Exception as e:
            print(f"❌ Error in LLM generation: {str(e)}")
            print(f"❌ Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            yield json.dumps({"error": f"Generation failed: {str(e)}"}) + "\n"

llm_service = LLMService()