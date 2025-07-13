import asyncio
import tempfile
import os
import signal
import wave
import numpy as np
import subprocess
from typing import Tuple, Optional
from config.settings import settings
from config.models import AudioMetrics
from services.settings_service import settings_service

class AudioService:
    def __init__(self):
        self.recording_process: Optional[subprocess.Popen] = None
    
    async def start_recording(self) -> str:
        """Start audio recording and return temp file path"""
        temp_file = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        temp_path = temp_file.name
        temp_file.close()
        
        # Get selected device from settings
        audio_settings = settings_service.get_audio_settings()
        device_index = audio_settings.get('selected_microphone')
        if device_index is None or device_index == '' or device_index == 'default':
            device_index = '0'
        ffmpeg_cmd = [
            'ffmpeg',
            '-f', 'avfoundation',
            '-i', f':{device_index}',  # Use selected or default microphone
            '-acodec', 'pcm_s16le',
            '-ar', str(settings.SAMPLE_RATE),
            '-ac', str(settings.CHANNELS),
            '-af', 'volume=3.0',  # Increase volume boost
            '-y',  # Overwrite output file
            temp_path
        ]
        
        try:
            self.recording_process = subprocess.Popen(
                ffmpeg_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=os.setsid if hasattr(os, 'setsid') else None
            )
            print(f"Started recording to {temp_path}")
            return temp_path
        except Exception as e:
            print(f"Error starting recording: {e}")
            raise Exception(f"Failed to start recording: {str(e)}")
    
    async def stop_recording(self):
        """Stop the recording process"""
        if self.recording_process:
            try:
                # Send SIGTERM to process group to ensure clean shutdown
                if hasattr(os, 'killpg'):
                    os.killpg(os.getpgid(self.recording_process.pid), signal.SIGTERM)
                else:
                    self.recording_process.terminate()
                
                # Wait for process to finish, with timeout
                try:
                    self.recording_process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    self.recording_process.kill()
                    
                print("Recording stopped successfully")
            except Exception as e:
                print(f"Error stopping recording: {e}")
            finally:
                self.recording_process = None
    
    async def process_audio_file(self, file_path: str) -> Tuple[AudioMetrics, np.ndarray]:
        """Process audio file and return metrics and audio data"""
        try:
            with wave.open(file_path, 'rb') as wav_file:
                frames = wav_file.readframes(wav_file.getnframes())
                audio_data = np.frombuffer(frames, dtype=np.int16)
                
                max_amplitude = np.max(np.abs(audio_data))
                mean_amplitude = np.mean(np.abs(audio_data))
                duration = wav_file.getnframes() / wav_file.getframerate()
                
                metrics = AudioMetrics(
                    max_amplitude=int(max_amplitude),
                    mean_amplitude=int(mean_amplitude),
                    duration=duration
                )
                
                return metrics, audio_data
                
        except Exception as e:
            raise Exception(f"Error processing audio file: {str(e)}")
    
    async def validate_audio(self, metrics: AudioMetrics) -> bool:
        """Validate audio quality"""
        print(f"Audio validation: max_amplitude={metrics.max_amplitude}, threshold={settings.MIN_AMPLITUDE}")
        is_valid = metrics.max_amplitude >= settings.MIN_AMPLITUDE
        if not is_valid:
            print(f"Audio rejected: amplitude {metrics.max_amplitude} < {settings.MIN_AMPLITUDE}")
        return is_valid
    
    async def cleanup_temp_file(self, file_path: str):
        """Clean up temporary audio file"""
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
        except Exception:
            pass

audio_service = AudioService()