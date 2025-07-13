from fastapi.middleware.cors import CORSMiddleware
from config.settings import settings

def setup_middleware(app):
    """Setup CORS and other middleware"""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )