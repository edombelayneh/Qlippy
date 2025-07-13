# Qlippy

A modern AI chat application with local storage, built with Next.js frontend and Flask backend.

## Features

- 🤖 **AI Chat Interface** - Clean, modern chat interface
- 💾 **Local Storage** - All data stored locally using SQLite
- 🔌 **Plugin System** - Extensible plugin architecture
- 📁 **Conversation Management** - Organize chats with folders
- 🎨 **Modern UI** - Beautiful, responsive design with dark mode
- ⚡ **Fast & Lightweight** - Built with Next.js and Flask
- 🚀 **Simple Setup** - No user accounts or authentication required

## Architecture

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, and Radix UI
- **Backend**: Flask with SQLAlchemy and SQLite
- **Database**: SQLite (local storage)
- **Styling**: Tailwind CSS with custom components

## Environment Setup

### 1. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file and add your Picovoice access key:

```env
PORCUPINE_ACCESS_KEY=your_actual_access_key_here
```

**To get a Picovoice access key:**
1. Go to [Picovoice Console](https://console.picovoice.ai/)
2. Create an account or log in
3. Get your free access key
4. Add it to the `.env` file

> **Note**: The `.env` file is already in `.gitignore` to keep your access key secure.

**Quick Setup:**
```bash
npm run setup
```
This will guide you through the environment configuration process.

## Quick Start

### Option 1: Use the Python Starter Script (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Qlippy
   ```

2. **Set up the environment**
   ```bash
   ./setup-env.sh
   ```

3. **Start the application**
   ```bash
   python start.py
   ```

This script will:
- Check all dependencies (Python, Node.js, virtual environment)
- Start the Flask backend server on port 5001
- Start the Next.js frontend server on port 3000
- Provide graceful shutdown with Ctrl+C

### Option 2: Use the Development Script

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Qlippy
   ```

2. **Run the development script**
   ```bash
   ./start_dev.sh
   ```

This script will:
- Check prerequisites (Python 3, Node.js, npm)
- Set up virtual environment for backend
- Install all dependencies
- Start both frontend and backend servers

### Option 2: Manual Setup

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the backend server**
   ```bash
   python run.py
   ```

The backend will be available at `http://localhost:5001`

#### Frontend Setup

1. **Install Node.js dependencies**
   ```bash
   npm install
   ```

2. **Start the development server**
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:3000`

## How to Use

### 1. First Time Setup
1. Open `http://localhost:3000` in your browser
2. You can start chatting immediately - no setup required!

### 2. Using the Chat
1. **Create a new conversation** - Click "New Chat" in the sidebar
2. **Send messages** - Type in the input area and press Enter
3. **Organize conversations** - Use folders to categorize your chats
4. **Switch models** - Select different AI models from the dropdown
5. **Manage plugins** - Enable/disable plugins as needed

### 3. Data Storage
- All conversations are saved locally in SQLite database
- Messages persist between sessions
- No internet connection required (except for AI responses)
- Your data stays private on your computer

## API Endpoints

### Health Check
- `GET /api/health` - Check server status

### Conversations
- `GET /api/conversations` - Get all conversations
- `POST /api/conversations` - Create a new conversation
- `GET /api/conversations/<conversation_id>` - Get conversation with messages
- `PUT /api/conversations/<conversation_id>` - Update conversation
- `DELETE /api/conversations/<conversation_id>` - Delete conversation

### Messages
- `POST /api/conversations/<conversation_id>/messages` - Add a message
- `PUT /api/messages/<message_id>` - Update a message
- `DELETE /api/messages/<message_id>` - Delete a message

### Plugins
- `GET /api/plugins` - Get all plugins
- `POST /api/plugins` - Create a new plugin
- `PUT /api/plugins/<plugin_id>` - Update a plugin
- `DELETE /api/plugins/<plugin_id>` - Delete a plugin

### Search
- `GET /api/search?q=<query>` - Search conversations

## Database Schema

### Conversations
- `id` (UUID) - Primary key
- `title` (String) - Conversation title
- `folder` (String) - Optional folder categorization
- `last_updated` (DateTime) - Last activity timestamp
- `created_at` (DateTime) - Creation timestamp

### Messages
- `id` (UUID) - Primary key
- `conversation_id` (UUID) - Foreign key to conversations
- `role` (String) - 'user' or 'assistant'
- `content` (Text) - Message content
- `timestamp` (DateTime) - Message timestamp

### Plugins
- `id` (UUID) - Primary key
- `name` (String) - Plugin name
- `description` (Text) - Plugin description
- `enabled` (Boolean) - Plugin enabled status
- `created_at` (DateTime) - Creation timestamp

## Troubleshooting

### Common Issues

#### 1. Infinite API Request Loop
If you see repeated API calls to `/api/conversations`, this has been fixed in the latest version. The issue was caused by a React useEffect dependency that was causing infinite re-renders.

#### 2. Backend Server Not Starting
- Ensure you've run `./setup-env.sh` to create the virtual environment
- Check that Python 3.10+ is installed
- Verify the backend directory contains `venv/` folder

#### 3. Frontend Server Not Starting
- Run `npm install` to install dependencies
- Ensure Node.js 18+ is installed
- Check that `node_modules/` directory exists

#### 4. Port Already in Use
If you get "port already in use" errors:
```bash
# Kill processes on ports 3000 and 5001
lsof -ti:3000 | xargs kill -9
lsof -ti:5001 | xargs kill -9
```

#### 5. Missing run.py File
The `run.py` file in the root directory has been created to properly start the backend server. If you encounter issues, use:
```bash
python run.py  # Starts backend only
python start.py  # Starts both frontend and backend
```

### Debug Mode
To run with verbose logging:
```bash
# Backend only
cd backend && python run.py

# Frontend only
npm run dev

# Both with logging
python start.py
```

## Development
```
Qlippy/
├── app/                    # Next.js app directory
│   ├── chat/              # Chat page
│   ├── plugins/           # Plugins page
│   ├── search/            # Search page
│   └── settings/          # Settings page
├── backend/               # Flask backend
│   ├── app.py             # Main Flask app
│   ├── config.py          # Configuration
│   ├── models.py          # Database models
│   ├── routes.py          # API routes
│   ├── run.py             # Server startup
│   └── requirements.txt   # Python dependencies
├── components/            # React components
│   ├── ui/               # UI components
│   └── ...               # Feature components
├── hooks/                # React hooks
├── lib/                  # Utilities and API
└── public/               # Static assets
```

### Testing

#### Backend Testing
```bash
cd backend
python test_api.py
```

#### Frontend Testing
```bash
npm run test
```

### Building for Production

#### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
```

#### Frontend
```bash
npm run build
npm start
```

## Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5001/api

# Backend Configuration (optional)
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
```

### Backend Configuration

Edit `backend/config.py` to modify:
- Database URI
- CORS origins
- Secret keys
- File upload limits
- Logging settings

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Backend: Change port in `backend/run.py`
   - Frontend: Change port in `package.json` scripts

2. **Database errors**
   - Delete `backend/qlippy.db` and restart the server
   - Or run `python reset_db.py` to reset the database

3. **CORS errors**
   - Check CORS origins in `backend/config.py`

4. **Module not found errors**
   - Run `npm install` for frontend
   - Run `pip install -r requirements.txt` for backend

5. **App not loading**
   - Make sure backend is running on port 5001
   - Check browser console for API errors

### Logs

- **Backend**: Check terminal output for Flask logs
- **Frontend**: Check browser console and terminal output

## Current Status

✅ **Backend**: Fully working on `http://localhost:5001`
✅ **Database**: SQLite with all tables created
✅ **API**: All endpoints tested and working
✅ **Frontend Integration**: Simplified without user management
✅ **Message Storage**: All messages saved to database
✅ **Plugin System**: Working without user context
✅ **Search Functionality**: Working without user context
