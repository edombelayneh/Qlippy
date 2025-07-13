import { AppError, ErrorRegistry } from "./errors";

export interface ApiResponse<T> {
  status: "success" | "error";
  data?: T;
  error?: string;
}

export async function fetchJson<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: any
): Promise<T> {
  try {
    const url = endpoint;
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new AppError(
        ErrorRegistry.API_ERROR.code,
        `HTTP error! status: ${response.status}`,
        ErrorRegistry.API_ERROR.userMessage,
      );
    }

    const data: ApiResponse<T> = await response.json();
    
    if (data.status === "error") {
      throw new AppError(
        ErrorRegistry.API_ERROR.code,
        data.error || "Unknown API error",
        ErrorRegistry.API_ERROR.userMessage,
      );
    }

    return data.data as T;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      ErrorRegistry.NETWORK_ERROR.code,
      "Failed to communicate with API",
      ErrorRegistry.NETWORK_ERROR.userMessage,
      error as Error,
    );
  }
}

// Settings API helpers
const settingsApiCore = {
  // Theme settings
  getTheme: () => fetchJson<{ theme: string }>("/api/settings/theme"),
  setTheme: (theme: string) => fetchJson<{ theme: string }>("/api/settings/theme", "POST", { theme }),

  // TTS settings
  getTTS: () => fetchJson<{
    selectedVoice: string;
    playbackSpeed: number;
    testText: string;
  }>("/api/settings/tts"),
  setTTS: (settings: {
    selectedVoice: string;
    playbackSpeed: number;
    testText: string;
  }) => fetchJson<{
    selectedVoice: string;
    playbackSpeed: number;
    testText: string;
  }>("/api/settings/tts", "POST", settings),
  
  // TTS voices
  getTTSVoices: () => fetchJson<Array<{
    id: string;
    name: string;
    language: string;
    gender: "male" | "female" | "neutral";
    accent?: string;
  }>>("/api/settings/tts/voices"),

  // Model behavior settings
  getModelBehavior: () => fetchJson<{
    temperature: number;
    top_p: number;
    top_k: number;
    max_tokens: number;
    stop_sequences: string[];
    system_prompt: string;
  }>("/api/settings/model-behavior"),
  setModelBehavior: (settings: {
    temperature: number;
    top_p: number;
    top_k: number;
    max_tokens: number;
    stop_sequences: string[];
    system_prompt: string;
  }) => fetchJson<{
    temperature: number;
    top_p: number;
    top_k: number;
    max_tokens: number;
    stop_sequences: string[];
    system_prompt: string;
  }>("/api/settings/model-behavior", "POST", settings),

  // Audio device settings
  getAudio: () => fetchJson<{
    speaker_volume: number;
    mic_volume: number;
    selected_speaker: string | null;
    selected_microphone: string | null;
  }>("/api/settings/audio"),
  setAudio: (settings: {
    speaker_volume: number;
    mic_volume: number;
    selected_speaker: string | null;
    selected_microphone: string | null;
  }) => fetchJson<{
    speaker_volume: number;
    mic_volume: number;
    selected_speaker: string | null;
    selected_microphone: string | null;
  }>("/api/settings/audio", "POST", settings),

  // Rules
  getRules: () => fetchJson<Array<{
    id: string;
    description: string;
    is_enabled: boolean;
  }>>("/api/settings/rules"),
  addRule: (description: string) => fetchJson<any>("/api/settings/rules", "POST", { description }),
  deleteRule: (id: string) => fetchJson<{}>(`/api/settings/rules/${id}`, "DELETE"),
  toggleRule: (id: string, enabled: boolean) => fetchJson<{}>(`/api/settings/rules/${id}/toggle`, "POST", { enabled }),

  // RAG
  getRagIndexStats: () => fetchJson<{
    total_directories: number;
    total_files: number;
    indexed_files: number;
    total_chunks: number;
    active_conversation_contexts: number;
  }>("/api/rag/index-stats"),
  clearRagIndex: () => fetchJson<null>("/api/rag/clear-index", "POST"),
};

// Conversations API helpers
export const conversationsApi = {
  getConversations: () => fetchJson<any[]>("/api/conversations"),
  getConversationMessages: (id: string) => fetchJson<any[]>(`/api/conversations/${id}/messages`),
  createConversation: (title: string) => fetchJson<any>("/api/conversations", "POST", { title }),
  updateConversationTitle: (conversationId: string, title: string) => fetchJson<any>(`/api/conversations/${conversationId}/title`, "PUT", { title }),
  addMessage: (conversationId: string, role: string, content: string) => fetchJson<any>(`/api/conversations/${conversationId}/messages`, "POST", { role, content }),
  updateMessage: (conversationId: string, messageId: string, content: string) => fetchJson<any>(`/api/conversations/${conversationId}/messages/${messageId}`, "PUT", { role: "assistant", content }),
  deleteConversation: (id: string) => fetchJson<{}>(`/api/conversations/${id}`, "DELETE"),
};

// Models API helpers
export const modelsApi = {
  getModels: () => fetchJson<Array<{
    id: string;
    name: string;
    size: string;
    type: string;
    file_path: string;
    is_active: boolean;
    tool_calling_enabled: boolean;
  }>>("/api/models"),
  addModel: (name: string, file_path: string, file_size_display: string) => fetchJson<any>("/api/models", "POST", { name, file_path, file_size_display }),
  deleteModel: (id: string) => fetchJson<{}>(`/api/models/${id}`, "DELETE"),
  activateModel: (id: string) => fetchJson<{
    status: string;
    message: string;
    data: {
      model_id: string;
      loaded: boolean;
    };
  }>(`/api/models/${id}/activate`, "POST"),
  updateModelToolCalling: (id: string, enabled: boolean) => fetchJson<null>(`/api/models/${id}/tool-calling?enabled=${enabled}`, "POST"),
  getModelLoadingStatus: () => fetchJson<{
    status: string;
    data: {
      is_loading: boolean;
      progress: string;
      current_model_id: string | null;
      model_loaded: boolean;
    };
  }>("/api/models/loading-status"),
};

// Tools API helpers
export const toolsApi = {
  getTools: () => fetchJson<Array<{
    id: string;
    name: string;
    display_name: string;
    description: string;
    script: string;
    filename: string;
    script_type: string;
    is_enabled: boolean;
    execution_count: number;
    created_at: string;
    updated_at: string;
  }>>("/api/settings/tools"),
  createTool: (name: string, description: string, script: string, filename?: string) => fetchJson<any>("/api/settings/tools", "POST", { name, description, script, filename }),
  getTool: (id: string) => fetchJson<{
    id: string;
    name: string;
    display_name: string;
    description: string;
    script: string;
    filename: string;
    script_type: string;
    is_enabled: boolean;
    execution_count: number;
    created_at: string;
    updated_at: string;
  }>(`/api/settings/tools/${id}`),
  updateTool: (id: string, name: string, description: string, script: string, filename?: string) => fetchJson<any>(`/api/settings/tools/${id}`, "PUT", { name, description, script, filename }),
  deleteTool: (id: string) => fetchJson<{}>(`/api/settings/tools/${id}`, "DELETE"),
  validateTool: (name: string, description: string, script: string, filename?: string) => fetchJson<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>("/api/settings/tools/validate", "POST", { name, description, script, filename }),
};

// Backward compatibility: Keep the old settingsApi interface with conversations/models for now
// This will be removed in a future cleanup
export const legacySettingsApi = {
  ...settingsApiCore,
  // Conversations (deprecated - use conversationsApi)
  getConversations: conversationsApi.getConversations,
  getConversationMessages: conversationsApi.getConversationMessages,
  createConversation: conversationsApi.createConversation,
  updateConversationTitle: conversationsApi.updateConversationTitle,
  addMessage: conversationsApi.addMessage,
  updateMessage: conversationsApi.updateMessage,
  deleteConversation: conversationsApi.deleteConversation,
  
  // Models (deprecated - use modelsApi)
  getModels: modelsApi.getModels,
  addModel: modelsApi.addModel,
  deleteModel: modelsApi.deleteModel,
  activateModel: modelsApi.activateModel,
  updateModelToolCalling: modelsApi.updateModelToolCalling,
  getModelLoadingStatus: modelsApi.getModelLoadingStatus,
  
  // Tools (deprecated - use toolsApi)
  getTools: toolsApi.getTools,
  createTool: toolsApi.createTool,
  getTool: toolsApi.getTool,
  updateTool: toolsApi.updateTool,
  deleteTool: toolsApi.deleteTool,
  validateTool: toolsApi.validateTool,
};

// Export the legacy API as settingsApi for backward compatibility
export { legacySettingsApi as settingsApi }; 