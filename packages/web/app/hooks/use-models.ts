"use client"

import * as React from "react"
import { AIModel } from "@/lib/types"
import { settingsApi } from "@/lib/api"
import { toast } from "sonner"

export function useModels() {
  const [selectedModel, setSelectedModel] = React.useState<string>("")
  const [availableModels, setAvailableModels] = React.useState<AIModel[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // Fetch models from database
  React.useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true)
        const models = await settingsApi.getModels()
        
        // Convert database models to AIModel format
        const aiModels: AIModel[] = models.map(model => ({
          id: model.id,
          name: model.name,
          description: `${model.size} - ${model.type} format`,
        }))
        
        setAvailableModels(aiModels)
        
        // Set selected model to the active one, or first one if none active
        const activeModel = models.find(m => m.is_active)
        if (activeModel) {
          setSelectedModel(activeModel.id)
        } else if (models.length > 0) {
          setSelectedModel(models[0].id)
          // Set the first model as active if none is set
          await settingsApi.activateModel(models[0].id)
        }
      } catch (error) {
        console.error("Failed to load models:", error)
        toast.error("Failed to load models")
        // Fallback to empty array
        setAvailableModels([])
      } finally {
        setIsLoading(false)
      }
    }

    loadModels()
  }, [])

  const updateSelectedModel = async (modelId: string) => {
    try {
      await settingsApi.activateModel(modelId)
      setSelectedModel(modelId)
    } catch (error) {
      console.error("Failed to update selected model:", error)
      toast.error("Failed to update selected model")
    }
  }

  return {
    selectedModel,
    setSelectedModel: updateSelectedModel,
    availableModels,
    isLoading,
  }
} 