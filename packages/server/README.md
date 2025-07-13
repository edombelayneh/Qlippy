# Qlippy Backend Server

A FastAPI-based backend server for the Qlippy AI assistant application.

## Architecture

The backend follows a clean architecture pattern with clear separation of concerns:

```
packages/server/
├── main.py                    # FastAPI app entry point
├── start.py                   # Startup script with error checking
├── config/
│   ├── settings.py           # Application settings
│   └── models.py             # Pydantic data models
├── api/
│   ├── middleware.py         # CORS and other middleware
│   └── routes/               # API endpoints
│       ├── settings.py       # Settings management API
│       ├── generate.py       # LLM generation API
│       ├── speak.py          # Text-to-speech API
│       ├── websocket.py      # WebSocket for real-time features
│       └── health.py         # Health check endpoint
└── services/
    ├── settings_service.py   # Database operations for settings
    ├── llm_service.py        # LLM model integration
    ├── transcription_service.py  # Speech-to-text
    └── tts_service.py        # Text-to-speech
```

## Features

### ✅ Clean Architecture
- **HTTP Layer**: FastAPI routes with proper validation
- **Business Logic**: Service classes with database operations
- **Data Models**: Pydantic models for type safety
- **Database**: SQLite with proper foreign keys

### ✅ Comprehensive APIs
- **Settings Management**: Complete CRUD for all application settings
- **LLM Integration**: Phi-2 model with streaming support
- **Speech Services**: Whisper for transcription, pyttsx3 for TTS
- **Real-time Features**: WebSocket support for live interactions

### ✅ Database Single Source of Truth
- All settings stored in database, not hardcoded
- Dynamic voice discovery from system TTS engines
- Proper database migrations and initialization

## Prerequisites

1. **Python 3.12+** (tested with 3.12.3)
2. **Virtual Environment** activated
3. **Models** in correct locations:
   - LLM: `llm/phi-2.Q4_K_M.gguf` (in project root)
   - Whisper: `packages/server/models/whisper-base/`
4. **Database Schema**: `qlippy_mvp_schema.sql` (in project root)

## Installation & Setup

1. **Activate virtual environment**:
   ```bash
   cd /path/to/Qlippy
   source .env/bin/activate  # or your venv path
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Verify model locations**:
   ```bash
   ls -la llm/phi-2.Q4_K_M.gguf                    # Should exist
   ls -la packages/server/models/whisper-base/     # Should exist
   ls -la qlippy_mvp_schema.sql                    # Should exist
   ```

## Running the Server

### Option 1: Using the Start Script (Recommended)
```bash
cd packages/server
python start.py
```

The start script will:
- ✅ Check all requirements
- ✅ Verify model locations
- ✅ Start the server with proper error handling
- ✅ Show helpful startup information

### Option 2: Direct Execution
```bash
cd packages/server
python main.py
```

### Option 3: Using uvicorn directly
```bash
cd packages/server
uvicorn main:app --host 127.0.0.1 --port 11434
```

## Server Information

- **URL**: http://127.0.0.1:11434
- **API Documentation**: http://127.0.0.1:11434/docs
- **Health Check**: http://127.0.0.1:11434/health
- **CORS**: Configured for http://localhost:3000 (frontend)

## API Endpoints

### Settings Management
- `GET /api/settings/theme` - Get theme settings
- `POST /api/settings/theme` - Update theme settings
- `GET /api/settings/tts` - Get TTS settings
- `POST /api/settings/tts` - Update TTS settings
- `GET /api/settings/tts/voices` - Get available voices
- `GET /api/settings/model-behavior` - Get model parameters
- `POST /api/settings/model-behavior` - Update model parameters

### LLM & Speech
- `POST /api/generate` - Generate text with LLM
- `POST /api/speak` - Convert text to speech
- `WebSocket /ws` - Real-time audio transcription

### System
- `GET /health` - Health check endpoint

## Database

The server uses SQLite with the following key tables:
- `settings` - Key-value store for application settings
- `conversations` - Chat conversation history
- `messages` - Individual chat messages
- `models` - Registered LLM models
- `rules` - User-defined rules
- `model_behavior` - LLM parameters

Database is automatically initialized on first startup if it doesn't exist.

## Troubleshooting

### Common Issues

1. **Import Errors**: Make sure you're in the virtual environment
2. **Model Not Found**: Check that models are in the correct locations
3. **Database Errors**: Ensure `qlippy_mvp_schema.sql` exists in project root
4. **Port Already in Use**: Another process might be using port 11434

### Fixed Issues ✅

- **LLM Model Path**: Fixed incorrect path in `config/settings.py`
- **Database Schema**: Fixed path resolution in `main.py`
- **Import Dependencies**: All imports now work correctly

### Debugging

Enable debug mode by setting environment variable:
```bash
export DEBUG=1
python start.py
```

## Development

### Architecture Principles
- **Single Responsibility**: Each service handles one concern
- **Dependency Injection**: Services are injected, not imported
- **Error Handling**: Comprehensive error handling at all levels
- **Type Safety**: Pydantic models for all data

### Adding New Features
1. Add data models in `config/models.py`
2. Add service logic in `services/`
3. Add API routes in `api/routes/`
4. Update `main.py` to include new routes

## Performance Notes

- **Model Loading**: Models are loaded once at startup
- **Database**: Uses connection pooling for better performance
- **Memory Usage**: ~2GB RAM for LLM model (Phi-2)
- **Response Time**: ~100-500ms for typical requests

## Security

- **CORS**: Properly configured for frontend origin
- **SQL Injection**: All queries use parameterized statements
- **Input Validation**: Pydantic models validate all inputs
- **Error Exposure**: Errors are logged but not exposed to clients 