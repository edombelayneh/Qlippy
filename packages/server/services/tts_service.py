import asyncio
import pyttsx3
from typing import List, Dict, Any
from config.settings import settings

class TTSService:
    def __init__(self):
        self.engine = pyttsx3.init()
        self._configure_engine()
    
    def _configure_engine(self):
        """Configure TTS engine settings"""
        try:
            # Set properties
            self.engine.setProperty('rate', 150)    # Speed of speech
            self.engine.setProperty('volume', 0.9)  # Volume level
        except Exception as e:
            print(f"Warning: Could not configure TTS engine: {e}")
    
    async def speak_text(self, text: str):
        """Speak text asynchronously"""
        try:
            def _speak():
                self.engine.say(text)
                self.engine.runAndWait()
            
            # Run in thread pool to avoid blocking
            await asyncio.get_event_loop().run_in_executor(None, _speak)
            
        except Exception as e:
            raise Exception(f"TTS failed: {str(e)}")
    
    async def stop_speaking(self):
        """Stop current speech"""
        try:
            self.engine.stop()
        except Exception as e:
            raise Exception(f"Failed to stop TTS: {str(e)}")
    
    def get_available_voices(self) -> List[Dict[str, Any]]:
        """Get available TTS voices filtered for English speakers"""
        try:
            voices = self.engine.getProperty('voices')
            english_voices = []
            
            for voice in voices:
                if voice is not None:
                    # Extract voice info
                    voice_id = voice.id
                    voice_name = getattr(voice, 'name', 'Unknown')
                    voice_languages = getattr(voice, 'languages', [])
                    voice_gender = getattr(voice, 'gender', None)
                    
                    # Filter for English languages
                    is_english = False
                    language_info = "English"
                    accent = None
                    
                    if voice_languages:
                        for lang in voice_languages:
                            lang_str = str(lang).lower()
                            if 'en' in lang_str or 'english' in lang_str:
                                is_english = True
                                # Try to determine specific English variant
                                if 'us' in lang_str or 'united states' in lang_str:
                                    language_info = "English (US)"
                                elif 'gb' in lang_str or 'british' in lang_str or 'uk' in lang_str:
                                    language_info = "English (UK)"
                                    accent = "British"
                                elif 'au' in lang_str or 'australia' in lang_str:
                                    language_info = "English (AU)"
                                    accent = "Australian"
                                elif 'ca' in lang_str or 'canada' in lang_str:
                                    language_info = "English (CA)"
                                    accent = "Canadian"
                                break
                    
                    # Also check voice name for English indicators
                    voice_name_lower = voice_name.lower()
                    if not is_english and any(indicator in voice_name_lower for indicator in ['english', 'en-', 'us', 'uk', 'au']):
                        is_english = True
                    
                    if is_english:
                        # Determine gender from voice properties or name
                        gender = "neutral"
                        if voice_gender:
                            gender_str = str(voice_gender).lower()
                            if 'male' in gender_str and 'female' not in gender_str:
                                gender = "male"
                            elif 'female' in gender_str:
                                gender = "female"
                        else:
                            # Try to guess from name
                            common_female_names = ['aria', 'jenny', 'sarah', 'emily', 'anna', 'victoria', 'kate', 'helen', 'susan', 'linda', 'maria', 'karen', 'lisa', 'natasha', 'libby', 'elvira', 'katja', 'denise']
                            common_male_names = ['davis', 'guy', 'ryan', 'william', 'henri', 'conrad', 'alvaro', 'david', 'mark', 'andrew', 'thomas', 'james', 'robert', 'daniel']
                            
                            name_words = voice_name_lower.split()
                            for word in name_words:
                                if any(female_name in word for female_name in common_female_names):
                                    gender = "female"
                                    break
                                elif any(male_name in word for male_name in common_male_names):
                                    gender = "male"
                                    break
                        
                        english_voices.append({
                            "id": voice_id,
                            "name": voice_name,
                            "language": language_info,
                            "gender": gender,
                            "accent": accent
                        })
            
            # Sort by gender (female first) then by name
            english_voices.sort(key=lambda x: (x["gender"] != "female", x["name"]))
            
            # If no voices found, return a fallback
            if not english_voices:
                english_voices = [{
                    "id": "default",
                    "name": "Default System Voice",
                    "language": "English",
                    "gender": "neutral",
                    "accent": None
                }]
            
            return english_voices
            
        except Exception as e:
            print(f"Error getting voices: {e}")
            # Return fallback voice
            return [{
                "id": "default",
                "name": "Default System Voice", 
                "language": "English",
                "gender": "neutral",
                "accent": None
            }]

    def get_english_voices(self) -> List[Dict[str, Any]]:
        """Return only English voices from get_available_voices"""
        all_voices = self.get_available_voices()
        english_voices = [v for v in all_voices if 'english' in v['language'].lower() or (v.get('accent') and v['accent'] in ['British', 'Australian', 'Canadian'])]
        return english_voices

tts_service = TTSService()