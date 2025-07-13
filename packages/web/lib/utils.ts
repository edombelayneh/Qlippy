import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { AppError, ErrorRegistry } from "./errors"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function generateLLMResponse(prompt: string): Promise<string> {
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new AppError(
        ErrorRegistry.API_ERROR.code,
        `HTTP error! status: ${response.status}`,
        ErrorRegistry.API_ERROR.userMessage,
      );
    }

    const data = await response.json();
    if (data.error) {
      throw new AppError(
        ErrorRegistry.API_ERROR.code,
        data.error,
        ErrorRegistry.API_ERROR.userMessage,
      );
    }
    return data.response;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      ErrorRegistry.NETWORK_ERROR.code,
      "Failed to generate response. Make sure the local LLM server is running.",
      ErrorRegistry.NETWORK_ERROR.userMessage,
      error as Error,
    );
  }
}

export async function* generateLLMStreamResponseSSE(
  prompt: string,
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  console.log("🔍 Starting SSE stream");
  
  // Since EventSource only supports GET, we'll use a different approach
  // We'll create a temporary session and use fetch with SSE format
  try {
    const response = await fetch("/api/generate-sse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
      signal, // Add signal for abort support
    });

    if (!response.ok) {
      throw new AppError(
        ErrorRegistry.API_ERROR.code,
        `HTTP error! status: ${response.status}`,
        ErrorRegistry.API_ERROR.userMessage,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new AppError(
        ErrorRegistry.UNKNOWN_ERROR.code,
        "No reader available",
        "An unexpected error occurred while processing the response.",
      );
    }

    const decoder = new TextDecoder();
    let buffer = "";
    
    while (true) {
      // Check for abort signal
      if (signal?.aborted) {
        reader.cancel();
        throw new Error("AbortError");
      }
      
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data.trim()) {
            try {
              const parsed = JSON.parse(data);
              if (parsed.token !== undefined) {
                yield parsed.token;
              }
            } catch (e) {
              console.warn("Failed to parse SSE data:", data);
            }
          }
        } else if (line.startsWith("event: ")) {
          const event = line.slice(7);
          console.log("🔍 SSE Event:", event);
          if (event === "done") {
            break;
          }
        }
      }
    }
  } catch (error) {
    console.error("🔍 SSE stream error:", error);
    // Re-throw AbortError to preserve abort behavior
    if (error instanceof Error && (error.message === "AbortError" || error.name === "AbortError")) {
      const abortError = new Error("AbortError");
      abortError.name = "AbortError";
      throw abortError;
    }
    throw error;
  }
}

// Add a configuration flag to choose streaming method
export const USE_SSE_STREAMING = false; // Set to true to use SSE format

// Check if active model supports tool calling
async function getActiveModelToolCalling(): Promise<boolean> {
  try {
    const response = await fetch("/api/settings/models");
    const data = await response.json();
    if (data.status === "success" && data.data) {
      const activeModel = data.data.find((model: any) => model.is_active);
      return activeModel?.tool_calling_enabled || false;
    }
    return false;
  } catch (error) {
    console.error("Error checking model tool calling:", error);
    return false;
  }
}

export async function* generateLLMStreamResponse(
  prompt: string,
  signal?: AbortSignal,
  conversationId?: string,
): AsyncGenerator<string, void, unknown> {
  // Use SSE streaming if enabled
  if (USE_SSE_STREAMING) {
    yield* generateLLMStreamResponseSSE(prompt, signal);
    return;
  }
  
  // Check if active model supports tool calling
  const supportsToolCalling = await getActiveModelToolCalling();
  
  console.log("🔍 Starting generateLLMStreamResponse");
  console.log("🔍 Prompt:", prompt);
  console.log("🔍 Tool calling supported:", supportsToolCalling);
  
  try {
    // Choose endpoint based on tool calling support
    const endpoint = supportsToolCalling ? "/api/langgraph/stream" : "/api/generate";
    const requestBody = supportsToolCalling 
      ? { 
          input: prompt,
          chat_history: [], // TODO: Pass actual chat history if needed
          conversation_id: conversationId 
        }
      : { 
          prompt,
          conversation_id: conversationId,
          use_enhanced_memory: true // Enable enhanced memory and RAG for basic generate endpoint
        };
    
    console.log("🔍 Using endpoint:", endpoint);
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
      },
      body: JSON.stringify(requestBody),
      signal, // Add signal for abort support
    });

    console.log("🔍 Response status:", response.status);
    console.log("🔍 Response headers:", response.headers);
    console.log("🔍 Content-Type:", response.headers.get("content-type"));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🔍 Error response:", errorText);
      throw new AppError(
        ErrorRegistry.API_ERROR.code,
        `HTTP error! status: ${response.status}`,
        ErrorRegistry.API_ERROR.userMessage,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new AppError(
        ErrorRegistry.UNKNOWN_ERROR.code,
        "No reader available",
        "An unexpected error occurred while processing the response.",
      );
    }

    console.log("🔍 Got reader, starting to read stream");
    const decoder = new TextDecoder();
    let buffer = "";
    let chunkCount = 0;
    
    while (true) {
      // Check for abort signal
      if (signal?.aborted) {
        reader.cancel();
        throw new Error("AbortError");
      }
      
      const { done, value } = await reader.read();
      if (done) {
        console.log("🔍 Stream done, total chunks:", chunkCount);
        break;
      }
      
      chunkCount++;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      
      // Keep the last line in buffer if it's incomplete
      buffer = lines.pop() || "";
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine === "") continue;
        
        if (chunkCount <= 5) {
          console.log("🔍 Line", chunkCount, ":", trimmedLine);
        }
        
        try {
          const parsed = JSON.parse(trimmedLine);
          if (parsed.type === "tools") {
            console.log("🔍 Tools used:", parsed.tools);
            // We could yield a special marker for tools if needed
          } else if (parsed.token !== undefined) {
            yield parsed.token;
          } else if (parsed.done) {
            console.log("🔍 Stream complete signal received");
          } else if (parsed.error) {
            console.error("🔍 Stream error:", parsed.error);
            throw new AppError(
              ErrorRegistry.API_ERROR.code,
              parsed.error,
              parsed.error
            );
          }
        } catch (e) {
          // If it's not JSON, log and skip
          if (chunkCount <= 5) {
            console.warn("🔍 Non-JSON line:", trimmedLine);
          }
        }
      }
    }
    
    // Process any remaining buffer
    if (buffer.trim()) {
      console.log("🔍 Processing remaining buffer:", buffer);
      try {
        const parsed = JSON.parse(buffer);
        if (parsed.token) {
          yield parsed.token;
        }
      } catch (e) {
        console.warn("🔍 Failed to parse remaining buffer:", buffer);
      }
    }
  } catch (error) {
    console.error("🔍 generateLLMStreamResponse error:", error);
    // Re-throw AbortError to preserve abort behavior
    if (error instanceof Error && error.message === "AbortError") {
      const abortError = new Error("AbortError");
      abortError.name = "AbortError";
      throw abortError;
    }
    throw error;
  }
}

export async function speakText(text: string, stop = false): Promise<void> {
  try {
    const response = await fetch("/api/speak", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, stop }),
    });

    if (!response.ok) {
      throw new AppError(
        ErrorRegistry.API_ERROR.code,
        `HTTP error! status: ${response.status}`,
        ErrorRegistry.API_ERROR.userMessage,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      ErrorRegistry.NETWORK_ERROR.code,
      "Error calling speak API",
      ErrorRegistry.NETWORK_ERROR.userMessage,
      error as Error,
    );
  }
}

export async function stopSpeaking(): Promise<void> {
  try {
    const response = await fetch("/api/speak", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: "", stop: true }),
    });

    if (!response.ok) {
      throw new AppError(
        ErrorRegistry.API_ERROR.code,
        `HTTP error! status: ${response.status}`,
        ErrorRegistry.API_ERROR.userMessage,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      ErrorRegistry.NETWORK_ERROR.code,
      "Error stopping speech",
      ErrorRegistry.NETWORK_ERROR.userMessage,
      error as Error,
    );
  }
}
