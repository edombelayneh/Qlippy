"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, Upload, FileText, Download, Loader2, CheckCircle, AlertCircle, Play, Wrench } from "lucide-react"
import { toast } from "sonner"
import { settingsApi } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"

interface Model {
  id: string
  name: string
  size: string
  type: string
  file_path?: string
  is_active?: boolean
  tool_calling_enabled?: boolean
}

interface LoadingStatus {
  is_loading: boolean
  progress: string
  current_model_id: string | null
  model_loaded: boolean
}

export function ManageModelsSettings() {
  const [models, setModels] = React.useState<Model[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadingStatus, setLoadingStatus] = React.useState<LoadingStatus>({
    is_loading: false,
    progress: "",
    current_model_id: null,
    model_loaded: false
  })

  const [showAddDialog, setShowAddDialog] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [modelToDelete, setModelToDelete] = React.useState<Model | null>(null)
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [activatingModelId, setActivatingModelId] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Load models from database
  React.useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true)
        const modelsData = await settingsApi.getModels()
        setModels(modelsData)
      } catch (error) {
        console.error("Failed to load models:", error)
        toast.error("Failed to load models")
      } finally {
        setIsLoading(false)
      }
    }

    loadModels()
  }, [])

  // Poll loading status when models are loading
  React.useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (loadingStatus.is_loading || activatingModelId) {
      interval = setInterval(async () => {
        try {
          const status = await settingsApi.getModelLoadingStatus()
          setLoadingStatus(status.data)
          
          // Update active model status
          if (!status.data.is_loading && activatingModelId) {
            // Refresh models list to get updated active status
            const updatedModels = await settingsApi.getModels()
            setModels(updatedModels)
            setActivatingModelId(null)
          }
        } catch (error) {
          console.error("Failed to get loading status:", error)
        }
      }, 1000) // Poll every second
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [loadingStatus.is_loading, activatingModelId])

  const handleActivateModel = async (model: Model) => {
    if (loadingStatus.is_loading || activatingModelId) {
      toast.error("Please wait for the current model to finish loading")
      return
    }

    try {
      setActivatingModelId(model.id)
      toast.info(`Activating ${model.name}...`)
      
      const result = await settingsApi.activateModel(model.id)
      
      if (result.data.loaded) {
        toast.success(`${model.name} activated and loaded successfully`)
        // Update models list
        const updatedModels = await settingsApi.getModels()
        setModels(updatedModels)
      } else {
        toast.warning(`${model.name} was set as active but failed to load fully`)
      }
    } catch (error) {
      console.error("Failed to activate model:", error)
      toast.error(`Failed to activate ${model.name}`)
    } finally {
      setActivatingModelId(null)
    }
  }

  const handleDeleteModel = async (model: Model) => {
    if (models.length <= 1) {
      toast.error("You must have at least one model")
      return
    }
    
    if (model.is_active && loadingStatus.current_model_id === model.id) {
      toast.error("Cannot delete the currently loaded model")
      return
    }
    
    setModelToDelete(model)
    setShowDeleteDialog(true)
  }

  const handleToggleToolCalling = async (model: Model, enabled: boolean) => {
    try {
      const response = await settingsApi.updateModelToolCalling(model.id, enabled) as any
      toast.success(response?.message || `Tool calling ${enabled ? 'enabled' : 'disabled'} for model`)
      // Refresh models list
      const models = await settingsApi.getModels()
      setModels(models)
    } catch (error) {
      console.error('Error toggling tool calling:', error)
      toast.error('Failed to update tool calling setting')
    }
  }

  const confirmDeleteModel = async () => {
    if (modelToDelete) {
      try {
        await settingsApi.deleteModel(modelToDelete.id)
        setModels(prev => prev.filter(m => m.id !== modelToDelete.id))
        toast.success(`${modelToDelete.name} has been removed`)
      } catch (error) {
        console.error("Failed to delete model:", error)
        toast.error("Failed to delete model")
      }
      setModelToDelete(null)
    }
    setShowDeleteDialog(false)
  }

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const ggufFiles = fileArray.filter(file => 
      file.name.toLowerCase().endsWith('.gguf')
    )

    if (ggufFiles.length === 0) {
      toast.error("Please select GGUF files only")
      return
    }

    setIsUploading(true)
    
    try {
      // Process each GGUF file
      for (const file of ggufFiles) {
        // Create temporary file path (in real implementation, you'd upload to server)
        const filePath = `llm/${file.name}`
        const fileName = file.name.replace('.gguf', '')
        const fileSize = `${(file.size / (1024 * 1024 * 1024)).toFixed(1)} GB`
        
        // Add model to database
        await settingsApi.addModel(fileName, filePath, fileSize)
        toast.success(`${fileName} has been added`)
      }
      
      // Reload models
      const modelsData = await settingsApi.getModels()
      setModels(modelsData)
      setShowAddDialog(false)
    } catch (error) {
      console.error("Failed to add models:", error)
      toast.error("Failed to add models")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files)
    }
    // Reset input
    e.target.value = ''
  }

  const getModelStatus = (model: Model) => {
    if (activatingModelId === model.id) {
      return "activating"
    }
    if (loadingStatus.current_model_id === model.id && loadingStatus.is_loading) {
      return "loading"
    }
    if (loadingStatus.current_model_id === model.id && loadingStatus.model_loaded) {
      return "loaded"
    }
    if (model.is_active) {
      return "active"
    }
    return "inactive"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Manage Models</h2>
          <p className="text-muted-foreground">
            Manage your AI model collection. Click activate to load a model for use.
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Model</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Model</DialogTitle>
              <DialogDescription>
                Upload GGUF model files to add them to your collection.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragOver
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center space-y-2">
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                  <div className="text-sm font-medium">
                    {isUploading ? "Processing files..." : "Drag and drop GGUF files here"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isUploading ? "Please wait..." : "or click to browse"}
                  </div>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".gguf"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
              <div className="text-xs text-muted-foreground">
                Only GGUF format files are supported. Place files in the llm/ directory.
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading Status Card */}
      {(loadingStatus.is_loading || activatingModelId) && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div className="flex-1">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Loading Model
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {loadingStatus.progress || "Preparing to load model..."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Available Models ({models.length})</CardTitle>
          <CardDescription>
            You must have at least one model. Active models are loaded into memory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="w-8 h-8 rounded-md" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="w-8 h-8" />
                  </div>
                </div>
              ))
            ) : models.map((model) => {
              const status = getModelStatus(model)
              return (
                <div
                  key={model.id}
                  className="group flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {model.name}
                        {status === "loaded" && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {status === "loading" && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        )}
                        {status === "activating" && (
                          <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        {model.size}
                        {status === "loaded" && (
                          <Badge variant="default" className="text-xs">Loaded</Badge>
                        )}
                        {status === "active" && !loadingStatus.model_loaded && (
                          <Badge variant="secondary" className="text-xs">Active</Badge>
                        )}
                        {status === "loading" && (
                          <Badge variant="outline" className="text-xs">Loading...</Badge>
                        )}
                        {status === "activating" && (
                          <Badge variant="outline" className="text-xs">Activating...</Badge>
                        )}
                        {model.tool_calling_enabled && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            Tools
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                        <span>Tool Calling:</span>
                        <Switch
                          checked={model.tool_calling_enabled || false}
                          onCheckedChange={(enabled) => handleToggleToolCalling(model, enabled)}
                          disabled={loadingStatus.is_loading || activatingModelId !== null}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!model.is_active && status === "inactive" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleActivateModel(model)}
                        disabled={loadingStatus.is_loading || activatingModelId !== null}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Activate
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10 transition-colors"
                      onClick={() => handleDeleteModel(model)}
                      disabled={
                        models.length <= 1 || 
                        (model.is_active && loadingStatus.current_model_id === model.id) ||
                        loadingStatus.is_loading ||
                        activatingModelId !== null
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
            {!isLoading && models.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <div className="text-lg font-medium mb-2">No models found</div>
                <div className="text-sm">Add your first model to get started</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDeleteModel}
        title="Delete Model"
        description={`Are you sure you want to delete "${modelToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  )
} 