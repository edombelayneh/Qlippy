import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function generateLLMResponse(prompt: string): Promise<string> {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    return data.response;
  } catch (error) {
    console.error('Error calling LLM server:', error);
    throw new Error('Failed to generate response. Make sure the local LLM server is running.');
  }
}

export async function* generateLLMStreamResponse(prompt: string): AsyncGenerator<string, void, unknown> {
  try {
    const response = await fetch('/api/generate/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No reader available');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      // Convert the Uint8Array to string
      yield new TextDecoder().decode(value);
    }
  } catch (error) {
    console.error('Error in stream:', error);
    throw error;
  }
}

export async function speakText(text: string): Promise<void> {
  try {
    const response = await fetch('/api/speak', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error calling speak API:', error);
    throw error;
  }
}

export async function stopSpeaking(): Promise<void> {
  try {
    const response = await fetch('/api/speak', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: '', stop: true }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error stopping speech:', error);
    throw error;
  }
}
