# Qlippy

## If on Windows (Snapdragon X Elite) please clone from karim-owen branch!

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




**Quick Setup:**
```bash
npm install
```

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/edombelayneh/Qlippy.git
   cd Qlippy
   ```

2. **To get a Picovoice access key:**
1. Go to [Picovoice Console](https://console.picovoice.ai/)
2. Create an account or log in
3. Get your free access key
4. Add it to the `electron.js` file by replacing the 'accessKey' variable to your key.

> **Note**: We know this is bad practice lol

3. **SWITCH TO KARIM-OWEN BRANCH**
   ```bash
   git checkout karim-owen
   ```
4. **Download ollama and model**
   Go to [https://ollama.com/download/windows](https://ollama.com/download/windows) and download ollama.
   Install ollama
   Run this command to download the `llama3.1:8b` model:
   ```
   ollama pull llama3.1:8b
   ```

5. **Setup and run the backend server**
   ```
   pip install -r requirements.txt
   python qnn_sample_apps/src/llm/main.py
   ```

6. **In a separate terminal - start the frontend**
   ```bash
   npm run dev
   ```
   
7. **Say "Hey Qlippy" to activate the app, click on the avatar to open the main app**


