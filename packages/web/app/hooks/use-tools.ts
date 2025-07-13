"use client"

import * as React from "react"
import { settingsApi } from "@/lib/api"
import { toast } from "sonner"

interface Tool {
  id: string
  name: string
  display_name: string
  description: string
  script: string
  filename: string
  script_type: string
  is_enabled: boolean
  execution_count: number
  created_at: string
  updated_at: string
}

export function useTools() {
  const [tools, setTools] = React.useState<Tool[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchTools = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const toolsData = await settingsApi.getTools()
      setTools(toolsData)
    } catch (error) {
      console.error("Failed to fetch tools:", error)
      setError("Failed to load tools")
      toast.error("Failed to load tools")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchTools()
  }, [fetchTools])

  const deleteTool = async (toolId: string) => {
    try {
      await settingsApi.deleteTool(toolId)
      setTools(prev => prev.filter(tool => tool.id !== toolId))
      toast.success("Tool deleted successfully")
    } catch (error) {
      console.error("Failed to delete tool:", error)
      toast.error("Failed to delete tool")
    }
  }

  const toggleTool = async (toolId: string, enabled: boolean) => {
    try {
      // Note: We don't have a toggle endpoint yet, so we'll just update the local state
      setTools(prev => prev.map(tool => 
        tool.id === toolId ? { ...tool, is_enabled: enabled } : tool
      ))
      toast.success(`Tool ${enabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      console.error("Failed to toggle tool:", error)
      toast.error("Failed to toggle tool")
    }
  }

  const refetch = fetchTools

  return {
    tools,
    isLoading,
    error,
    deleteTool,
    toggleTool,
    refetch,
  }
} 