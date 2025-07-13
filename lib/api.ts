// Qlippy API Service
// Handles communication with the Flask backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  conversation_id: string;
}

export interface Conversation {
  id: string;
  title: string;
  folder?: string;
  last_updated: string;
  created_at: string;
  message_count: number;
  messages?: Message[];
  last_message_preview?: string;
  matching_messages?: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    preview: string;
  }[];
  match_count?: number;
}

export interface SearchResult {
  query: string;
  results: Conversation[];
  total_results: number;
}

export interface Plugin {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  created_at: string;
}

export interface Space {
  id: string;
  name: string;
  icon: string;
  color: string;
  conversationCount?: number;
}

class QlippyAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; message: string; timestamp: string }> {
    return this.request('/health');
  }

  // Conversation management
  async getConversations(): Promise<Conversation[]> {
    return this.request('/conversations');
  }

  async createConversation(
    title: string = 'New Conversation',
    folder?: string
  ): Promise<Conversation> {
    const data: any = { title };
    if (folder) data.folder = folder;

    return this.request('/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    return this.request(`/conversations/${conversationId}`);
  }

  async updateConversation(
    conversationId: string,
    updates: { title?: string; folder?: string }
  ): Promise<Conversation> {
    return this.request(`/conversations/${conversationId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteConversation(conversationId: string): Promise<{ message: string }> {
    return this.request(`/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  // Message management
  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<Message> {
    return this.request(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role, content }),
    });
  }

  async updateMessage(messageId: string, content: string): Promise<Message> {
    return this.request(`/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  async deleteMessage(messageId: string): Promise<{ message: string }> {
    return this.request(`/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  // Plugin management
  async getPlugins(): Promise<Plugin[]> {
    return this.request('/plugins');
  }

  async createPlugin(
    name: string,
    description: string = '',
    enabled: boolean = true
  ): Promise<Plugin> {
    return this.request('/plugins', {
      method: 'POST',
      body: JSON.stringify({ name, description, enabled }),
    });
  }

  async updatePlugin(
    pluginId: string,
    updates: { name?: string; description?: string; enabled?: boolean }
  ): Promise<Plugin> {
    return this.request(`/plugins/${pluginId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deletePlugin(pluginId: string): Promise<{ message: string }> {
    return this.request(`/plugins/${pluginId}`, {
      method: 'DELETE',
    });
  }

  // Search functionality
  async searchConversations(query: string): Promise<SearchResult> {
    return this.request(`/search?q=${encodeURIComponent(query)}`);
  }

  // Space management
  async getSpaces(): Promise<Space[]> {
    return this.request('/spaces');
  }

  async createSpace(
    name: string,
    icon: string = 'folder',
    color: string = '#3b82f6'
  ): Promise<Space> {
    return this.request('/spaces', {
      method: 'POST',
      body: JSON.stringify({ name, icon, color }),
    });
  }

  async updateSpace(
    spaceId: string,
    updates: { name?: string; icon?: string; color?: string }
  ): Promise<Space> {
    return this.request(`/spaces/${spaceId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteSpace(spaceId: string): Promise<{ message: string }> {
    return this.request(`/spaces/${spaceId}`, {
      method: 'DELETE',
    });
  }
}

// Create and export a singleton instance
export const qlippyAPI = new QlippyAPI();

// Export the class for testing or custom instances
export { QlippyAPI }; 