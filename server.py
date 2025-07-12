from fastapi import FastAPI, WebSocket, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import whisper
import numpy as np
import subprocess
import tempfile
import os
import json
from typing import Optional
import asyncio
import wave

app = FastAPI()

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Whisper model
print("Loading Whisper model...")
model = whisper.load_model("base")
print("Whisper model loaded!")

@app.websocket("/ws/record")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        # Create a temporary file for the recording
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            temp_path = temp_file.name
            
            # Start FFmpeg process for recording
            ffmpeg_cmd = [
                'ffmpeg',
                '-f', 'avfoundation',
                '-i', ':0',  # Use built-in microphone
                '-acodec', 'pcm_s16le',
                '-ar', '16000',
                '-ac', '1',
                '-af', 'volume=2.0',
                '-y',
                temp_path
            ]
            
            # Start recording
            process = subprocess.Popen(
                ffmpeg_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            await websocket.send_json({"status": "recording", "message": "Recording started"})
            
            # Wait for stop signal
            while True:
                try:
                    data = await websocket.receive_text()
                    if data == "stop":
                        break
                except Exception as e:
                    print(f"Error receiving websocket data: {e}")
                    break
            
            # Stop recording
            process.terminate()
            process.wait()
            
            # Verify the recording
            try:
                with wave.open(temp_path, 'rb') as wav_file:
                    frames = wav_file.readframes(wav_file.getnframes())
                    audio_data = np.frombuffer(frames, dtype=np.int16)
                    max_amplitude = np.max(np.abs(audio_data))
                    mean_amplitude = np.mean(np.abs(audio_data))
                    
                    await websocket.send_json({
                        "status": "processing",
                        "message": "Processing audio...",
                        "metrics": {
                            "max_amplitude": int(max_amplitude),
                            "mean_amplitude": int(mean_amplitude),
                            "duration": wav_file.getnframes() / wav_file.getframerate()
                        }
                    })
                    
                    # Check if audio is too quiet (lowered threshold for better detection)
                    if max_amplitude < 100:  # More reasonable threshold for normal speech
                        await websocket.send_json({
                            "status": "error",
                            "message": "Audio too quiet - please speak louder"
                        })
                        return
                
                # Transcribe with Whisper
                result = model.transcribe(
                    temp_path,
                    language="en",
                    initial_prompt="The following is a voice command or message:",
                    condition_on_previous_text=False
                )
                
                transcription = result["text"].strip()
                if transcription:
                    await websocket.send_json({
                        "status": "success",
                        "message": "Transcription complete",
                        "transcription": transcription
                    })
                else:
                    await websocket.send_json({
                        "status": "error",
                        "message": "No speech detected"
                    })
                    
            except Exception as e:
                await websocket.send_json({
                    "status": "error",
                    "message": f"Error processing audio: {str(e)}"
                })
            
            # Cleanup
            try:
                os.unlink(temp_path)
            except:
                pass
                
    except Exception as e:
        await websocket.send_json({
            "status": "error",
            "message": f"Server error: {str(e)}"
        })
    
    finally:
        await websocket.close()

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000) 