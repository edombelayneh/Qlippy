from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.audio_service import audio_service
from services.transcription_service import transcription_service
from config.models import WebSocketMessage
import json

router = APIRouter()

@router.websocket("/ws/record")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    temp_path = None
    
    try:
        print("🎙️ WebSocket connection established")
        
        # Start recording
        temp_path = await audio_service.start_recording()
        
        await websocket.send_json({
            "status": "recording",
            "message": "Recording started"
        })
        
        # Wait for stop signal
        while True:
            try:
                data = await websocket.receive_text()
                print(f"🎙️ Received WebSocket message: {data}")
                if data == "stop":
                    break
            except WebSocketDisconnect:
                print("🎙️ WebSocket disconnected")
                break
        
        # Stop recording
        await audio_service.stop_recording()
        print("🎙️ Recording stopped")
        
        # Process audio
        await websocket.send_json({
            "status": "processing",
            "message": "Processing audio...",
            "metrics": None
        })
        
        # Get audio metrics
        try:
            metrics, audio_data = await audio_service.process_audio_file(temp_path)
            print(f"🎙️ Audio metrics: {metrics}")
            
            # Send metrics update
            await websocket.send_json({
                "status": "processing",
                "message": "Audio processed, validating...",
                "metrics": {
                    "max_amplitude": metrics.max_amplitude,
                    "mean_amplitude": metrics.mean_amplitude,
                    "duration": metrics.duration
                }
            })
            
        except Exception as e:
            print(f"🎙️ Error processing audio: {e}")
            await websocket.send_json({
                "status": "error",
                "message": f"Error processing audio: {str(e)}"
            })
            return
        
        # Validate audio quality
        if not await audio_service.validate_audio(metrics):
            await websocket.send_json({
                "status": "error",
                "message": f"Audio too quiet (amplitude: {metrics.max_amplitude}) - please speak louder and closer to the microphone"
            })
            return
        
        # Transcribe audio
        try:
            print("🎙️ Starting transcription...")
            transcription = await transcription_service.transcribe_audio(temp_path)
            print(f"🎙️ Transcription result: {transcription}")
            
            if transcription and transcription.strip():
                await websocket.send_json({
                    "status": "success",
                    "message": "Transcription complete",
                    "transcription": transcription.strip(),
                    "metrics": {
                        "max_amplitude": metrics.max_amplitude,
                        "mean_amplitude": metrics.mean_amplitude,
                        "duration": metrics.duration
                    }
                })
            else:
                await websocket.send_json({
                    "status": "error",
                    "message": "No speech detected in audio"
                })
                
        except Exception as e:
            print(f"🎙️ Transcription error: {e}")
            await websocket.send_json({
                "status": "error",
                "message": f"Transcription failed: {str(e)}"
            })
            
    except Exception as e:
        print(f"🎙️ WebSocket error: {e}")
        await websocket.send_json({
            "status": "error",
            "message": f"Server error: {str(e)}"
        })
    
    finally:
        # Cleanup
        if temp_path:
            await audio_service.cleanup_temp_file(temp_path)
        try:
            await websocket.close()
        except:
            pass