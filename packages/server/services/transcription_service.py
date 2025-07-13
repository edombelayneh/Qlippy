import torch
import librosa
from transformers import WhisperForConditionalGeneration, WhisperProcessor
from config.settings import settings
from typing import Optional

class TranscriptionService:
    def __init__(self):
        self.model: Optional[WhisperForConditionalGeneration] = None
        self.processor: Optional[WhisperProcessor] = None
        self._load_model()
    
    def _load_model(self):
        """Load Whisper model and processor"""
        try:
            print("Loading Whisper model...")
            self.model = WhisperForConditionalGeneration.from_pretrained(
                str(settings.WHISPER_MODEL_PATH), 
                local_files_only=True
            )
            self.processor = WhisperProcessor.from_pretrained(
                str(settings.WHISPER_MODEL_PATH), 
                local_files_only=True
            )
            print("Whisper model loaded!")
        except Exception as e:
            raise Exception(f"Failed to load Whisper model: {str(e)}")
    
    async def transcribe_audio(self, file_path: str, sample_rate: int = 16000) -> str:
        """Transcribe audio file using Whisper"""
        try:
            # Load audio with librosa
            audio, _ = librosa.load(file_path, sr=sample_rate)

            # Force English transcription
            forced_decoder_ids = self.processor.get_decoder_prompt_ids(
                language="en", task="transcribe"
            )
            
            # Process with Whisper
            inputs = self.processor(audio, sampling_rate=sample_rate, return_tensors="pt")
            
            with torch.no_grad():
                predicted_ids = self.model.generate(
                    inputs["input_features"],
                    forced_decoder_ids=forced_decoder_ids
                )
            
            transcription = self.processor.batch_decode(
                predicted_ids, 
                skip_special_tokens=True
            )[0].strip()
            
            return transcription
            
        except Exception as e:
            raise Exception(f"Transcription failed: {str(e)}")

transcription_service = TranscriptionService()