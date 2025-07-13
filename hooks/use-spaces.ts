import { useState, useEffect, useCallback, useRef } from 'react';
import { qlippyAPI, Space } from '@/lib/api';

interface UseSpacesReturn {
  spaces: Space[];
  loading: boolean;
  error: string | null;
  createSpace: (name: string, icon?: string, color?: string) => Promise<Space>;
  updateSpace: (spaceId: string, updates: { name?: string; icon?: string; color?: string }) => Promise<void>;
  deleteSpace: (spaceId: string) => Promise<void>;
  loadSpaces: () => Promise<void>;
  refreshSpaces: () => Promise<void>;
}

export function useSpaces(): UseSpacesReturn {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const loadSpaces = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (loadingRef.current) return;
    
    console.log('Loading spaces...');
    setLoading(true);
    setError(null);
    loadingRef.current = true;
    
    try {
      console.log('Calling qlippyAPI.getSpaces...');
      const spacesData = await qlippyAPI.getSpaces();
      console.log('Loaded spaces:', spacesData.length, spacesData);
      setSpaces(spacesData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load spaces';
      setError(errorMessage);
      console.error('Failed to load spaces:', err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const createSpace = useCallback(async (
    name: string,
    icon: string = 'folder',
    color: string = '#3b82f6'
  ): Promise<Space> => {
    setLoading(true);
    setError(null);
    
    try {
      const newSpace = await qlippyAPI.createSpace(name, icon, color);
      setSpaces(prev => [...prev, newSpace]);
      return newSpace;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create space';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSpace = useCallback(async (
    spaceId: string,
    updates: { name?: string; icon?: string; color?: string }
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedSpace = await qlippyAPI.updateSpace(spaceId, updates);
      
      // Update spaces list
      setSpaces(prev => 
        prev.map(space => 
          space.id === spaceId ? updatedSpace : space
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update space';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSpace = useCallback(async (spaceId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await qlippyAPI.deleteSpace(spaceId);
      
      // Remove from spaces list
      setSpaces(prev => prev.filter(space => space.id !== spaceId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete space';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSpaces = useCallback(async () => {
    await loadSpaces();
  }, [loadSpaces]);

  // Load spaces on mount
  useEffect(() => {
    loadSpaces();
  }, [loadSpaces]);

  return {
    spaces,
    loading,
    error,
    createSpace,
    updateSpace,
    deleteSpace,
    loadSpaces,
    refreshSpaces,
  };
} 