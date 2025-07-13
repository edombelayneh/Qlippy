const fetch = require("node-fetch");

const API_BASE = "http://127.0.0.1:11434/api/settings";

let activeConversationId = null;

// Create a new conversation
const createConversation = async (title = "New Chat") => {
  try {
    const response = await fetch(`${API_BASE}/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.status === "success" && result.data) {
      activeConversationId = result.data.id;
      return result.data;
    }
    
    throw new Error("Invalid response format");
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }
};

// Add a message to conversation
const addMessageToConversation = async (conversationId, role, content) => {
  try {
    const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role, content })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to add message: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error adding message:", error);
    throw error;
  }
};

// Get active conversation
const getActiveConversation = async () => {
  if (!activeConversationId) {
    return null;
  }
  
  try {
    const response = await fetch(`${API_BASE}/conversations`);
    if (!response.ok) {
      throw new Error(`Failed to get conversations: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.status === "success" && result.data) {
      // Find the active conversation
      const conversation = result.data.find(c => c.id === activeConversationId);
      return conversation || null;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting active conversation:", error);
    return null;
  }
};

// Get conversation messages
const getConversationMessages = async (conversationId) => {
  try {
    const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`);
    
    if (!response.ok) {
      throw new Error(`Failed to get messages: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("Error getting messages:", error);
    return [];
  }
};

// Set active conversation
const setActiveConversation = (conversationId) => {
  activeConversationId = conversationId;
};

// Clear active conversation
const clearActiveConversation = () => {
  activeConversationId = null;
};

module.exports = {
  createConversation,
  addMessageToConversation,
  getActiveConversation,
  getConversationMessages,
  setActiveConversation,
  clearActiveConversation
}; 