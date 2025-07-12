import { useState, useEffect, useCallback } from 'react';
import { qlippyAPI, Conversation, Message } from '@/lib/api';

interface UseConversationsReturn {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  loading: boolean;
  error: string | null;
  loadConversations: (userId: string) => Promise<void>;
  createConversation: (userId: string, title?: string, folder?: string) => Promise<Conversation>;
  loadConversation: (conversationId: string) => Promise<void>;
  addMessage: (conversationId: string, role: 'user' | 'assistant', content: string) => Promise<Message>;
  updateConversation: (conversationId: string, updates: { title?: string; folder?: string }) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
  refreshConversations: () => Promise<void>;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadConversations = useCallback(async (userId: string) => {
    console.log('Loading conversations for user:', userId);
    setLoading(true);
    setError(null);
    setCurrentUserId(userId);
    
    try {
      const conversationsData = await qlippyAPI.getConversations(userId);
      console.log('Loaded conversations:', conversationsData.length);
      setConversations(conversationsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(errorMessage);
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createConversation = useCallback(async (
    userId: string,
    title: string = 'New Conversation',
    folder?: string
  ): Promise<Conversation> => {
    setLoading(true);
    setError(null);
    
    try {
      const newConversation = await qlippyAPI.createConversation(userId, title, folder);
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversation(newConversation);
      return newConversation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConversation = useCallback(async (conversationId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const conversation = await qlippyAPI.getConversation(conversationId);
      setActiveConversation(conversation);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversation';
      setError(errorMessage);
      console.error('Failed to load conversation:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addMessage = useCallback(async (
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<Message> => {
    console.log('Adding message:', { conversationId, role, contentLength: content.length });
    try {
      const message = await qlippyAPI.addMessage(conversationId, role, content);
      
      // Update active conversation with new message
      if (activeConversation && activeConversation.id === conversationId) {
        setActiveConversation(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: [...(prev.messages || []), message],
            last_updated: new Date().toISOString(),
          };
        });
      }
      
      // Update conversations list with new message (only update last_updated, don't trigger refresh)
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, last_updated: new Date().toISOString() }
            : conv
        )
      );
      
      return message;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add message';
      setError(errorMessage);
      throw err;
    }
  }, [activeConversation]);

  const updateConversation = useCallback(async (
    conversationId: string,
    updates: { title?: string; folder?: string }
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedConversation = await qlippyAPI.updateConversation(conversationId, updates);
      
      // Update conversations list
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId ? updatedConversation : conv
        )
      );
      
      // Update active conversation if it's the one being updated
      if (activeConversation && activeConversation.id === conversationId) {
        setActiveConversation(updatedConversation);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update conversation';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [activeConversation]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await qlippyAPI.deleteConversation(conversationId);
      
      // Remove from conversations list
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // Clear active conversation if it's the one being deleted
      if (activeConversation && activeConversation.id === conversationId) {
        setActiveConversation(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete conversation';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [activeConversation]);

  const refreshConversations = useCallback(async () => {
    if (currentUserId) {
      await loadConversations(currentUserId);
    }
  }, [currentUserId, loadConversations]);

  return {
    conversations,
    activeConversation,
    loading,
    error,
    loadConversations,
    createConversation,
    loadConversation,
    addMessage,
    updateConversation,
    deleteConversation,
    setActiveConversation,
    refreshConversations,
  };
} 