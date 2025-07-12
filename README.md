# Qlippy

A voice-enabled AI assistant with wake word detection and chat interface.

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Qlippy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up voice detection**
   ```bash
   # Copy the environment template
   cp .env.example .env
   
   # Edit .env and add your Porcupine access key
   # Get your free key from: https://console.picovoice.ai/
   ```

4. **Start the application**
   ```bash
   # Start the voice detection service
   npm run start:hotword
   
   # In another terminal, start the main app
   npm run electron
   ```

## Voice Setup

For detailed voice detection setup instructions, see [PORCUPINE_SETUP.md](./PORCUPINE_SETUP.md).

## Features

- 🎤 Voice wake word detection ("Hey Qlippy")
- 💬 Chat interface with AI assistant
- 🎨 Modern UI with dark/light theme support
- 🔧 Plugin system for extensibility
- ⚙️ Settings and configuration management

## Development

```bash
# Start development server
npm run dev

# Start electron app
npm run electron

# Start voice detection
npm run start:hotword
```