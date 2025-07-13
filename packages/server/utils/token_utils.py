def estimate_token_count(text: str) -> int:
    """Estimate token count for text"""
    return int(len(text.split()) * 0.75)

def smart_max_tokens(prompt: str, total_ctx: int = 2048, min_out: int = 64, max_out: int = None) -> int:
    """Calculate optimal max tokens based on prompt length"""
    # If max_out is not provided, try to load from database settings
    if max_out is None:
        try:
            from services.settings_service import settings_service
            model_behavior = settings_service.get_model_behavior()
            max_out = model_behavior.get('max_tokens', 512)
        except Exception as e:
            print(f"Warning: Could not load max_tokens from database: {e}")
            max_out = 512  # Fallback default
    
    prompt_tokens = estimate_token_count(prompt)
    available = total_ctx - prompt_tokens
    return max(min(available, max_out), min_out)