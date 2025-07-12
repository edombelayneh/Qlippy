"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { Plus, Trash2, Upload, FileText, Download } from "lucide-react"
import { toast } from "sonner"

interface Model {
  id: string
  name: string
  size: string
  type: string
}

export function ManageModelsSettings() {
  const [models, setModels] = React.useState<Model[]>([
    {
      id: "1",
      name: "Gemini 2.5 Flash",
      size: "4.2 GB",
      type: "GGUF",
    },
    {
      id: "2", 
      name: "Gemini 2.5 Flash Lite",
      size: "2.1 GB",
      type: "GGUF",
    },
    {
      id: "3",
      name: "GPT ImageGen",
      size: "8.5 GB", 
      type: "GGUF",
    },
    {
      id: "4",
      name: "Claude 4 Sonnet",
      size: "12.3 GB",
      type: "GGUF", 
    }
  ])

  const [showAddDialog, setShowAddDialog] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [modelToDelete, setModelToDelete] = React.useState<Model | null>(null)
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDeleteModel = (model: Model) => {
    if (models.length <= 1) {
      toast.error("You must have at least one model")
      return
    }
    setModelToDelete(model)
    setShowDeleteDialog(true)
  }

  const confirmDeleteModel = () => {
    if (modelToDelete) {
      setModels(prev => prev.filter(m => m.id !== modelToDelete.id))
      toast.success(`${modelToDelete.name} has been removed`)
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
    
    // Simulate upload process
    for (const file of ggufFiles) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate upload delay
      
      const newModel: Model = {
        id: Date.now().toString() + Math.random(),
        name: file.name.replace('.gguf', ''),
        size: `${(file.size / (1024 * 1024 * 1024)).toFixed(1)} GB`,
        type: "GGUF",
      }
      
      setModels(prev => [...prev, newModel])
      toast.success(`${newModel.name} has been added`)
    }
    
    setIsUploading(false)
    setShowAddDialog(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Manage Models</h2>
          <p className="text-muted-foreground">
            Manage your AI model collection.
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
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-sm font-medium">
                    Drag and drop GGUF files here
                  </div>
                  <div className="text-xs text-muted-foreground">
                    or click to browse
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
              />
              <div className="text-xs text-muted-foreground">
                Only GGUF format files are supported. Files will be validated before upload.
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Models ({models.length})</CardTitle>
          <CardDescription>
            You must have at least one model.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {models.map((model) => (
              <div
                key={model.id}
                className="group flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{model.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {model.size}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => handleDeleteModel(model)}
                    disabled={models.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {models.length === 0 && (
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