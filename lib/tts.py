import pyttsx3
import sys

def speak(text, rate=150):
    try:
        engine = pyttsx3.init()
        engine.setProperty('rate', rate)
        engine.say(text)
        engine.runAndWait()
        return True
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python tts.py 'text to speak'", file=sys.stderr)
        sys.exit(1)
    
    text = sys.argv[1]
    success = speak(text)
    sys.exit(0 if success else 1) 