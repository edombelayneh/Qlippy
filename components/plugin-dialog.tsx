"use client"

import * as React from "react"
import { Upload, FileText, Code, X, Plus } from "lucide-react"
import Editor from '@monaco-editor/react'

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface PluginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddPlugin: (plugin: {
    name: string
    description: string
    script: string
    filename?: string
  }) => void
}

export function PluginDialog({ open, onOpenChange, onAddPlugin }: PluginDialogProps) {
  const [toolName, setToolName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [scriptContent, setScriptContent] = React.useState("")
  const [uploadedContent, setUploadedContent] = React.useState("")
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [activeTab, setActiveTab] = React.useState("script")
  const [nameError, setNameError] = React.useState("")

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Detect theme for Monaco Editor
  const [isDarkMode, setIsDarkMode] = React.useState(false)

  React.useEffect(() => {
    // Check if dark mode is active
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark')
      setIsDarkMode(isDark)
    }

    checkTheme()

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  // Validate tool name (lowercase snake_case)
  const validateToolName = (name: string) => {
    const snakeCaseRegex = /^[a-z][a-z0-9_]*[a-z0-9]$|^[a-z]$/
    if (!name) {
      setNameError("Tool name is required")
      return false
    }
    if (!snakeCaseRegex.test(name)) {
      setNameError("Tool name must be lowercase snake_case (e.g., my_tool, data_processor)")
      return false
    }
    setNameError("")
    return true
  }

  const handleToolNameChange = (value: string) => {
    setToolName(value)
    if (value) {
      validateToolName(value)
    } else {
      setNameError("")
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.name.endsWith('.py')) {
        setSelectedFile(file)
        // Read file content
        const reader = new FileReader()
        reader.onload = (e) => {
          setUploadedContent(e.target?.result as string || "")
        }
        reader.readAsText(file)
      } else {
        alert("Please select a Python (.py) file")
        event.target.value = ""
      }
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setUploadedContent("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleAddPlugin = () => {
    if (!validateToolName(toolName)) {
      return
    }
    
    if (!description.trim()) {
      alert("Please provide a description for your plugin")
      return
    }

    const currentContent = activeTab === "script" ? scriptContent : uploadedContent
    if (!currentContent.trim()) {
      alert("Please provide Python script content")
      return
    }

    onAddPlugin({
      name: toolName,
      description: description.trim(),
      script: currentContent.trim(),
      filename: selectedFile?.name
    })

    // Reset form
    setToolName("")
    setDescription("")
    setScriptContent("")
    setUploadedContent("")
    setSelectedFile(null)
    setActiveTab("script")
    setNameError("")
    onOpenChange(false)
  }

  const handleCancel = () => {
    // Reset form
    setToolName("")
    setDescription("")
    setScriptContent("")
    setUploadedContent("")
    setSelectedFile(null)
    setActiveTab("script")
    setNameError("")
    onOpenChange(false)
  }

  const exampleScript = `def process_data(input_data):
    """
    Example plugin function.
    
    Args:
        input_data (str): The input data to process
        
    Returns:
        str: Processed result
    """
    # Your processing logic here
    result = input_data.upper()
    return f"Processed: {result}"`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Plugin
          </DialogTitle>
          <DialogDescription>
            Create a custom Python tool for your AI assistant. The tool name should follow Python function naming conventions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tool Name */}
          <div className="space-y-2">
            <Label htmlFor="tool-name">
              Tool Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tool-name"
              placeholder="e.g., data_processor, file_analyzer, web_scraper"
              value={toolName}
              onChange={(e) => handleToolNameChange(e.target.value)}
              className={nameError ? "border-destructive" : ""}
            />
            {nameError && (
              <p className="text-sm text-destructive">{nameError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Must be lowercase with underscores (snake_case). This will be the function name in Python.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Input
              id="description"
              placeholder="Brief description of what this tool does"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Python Script */}
          <div className="space-y-4">
            <Label>
              Python Script <span className="text-destructive">*</span>
            </Label>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="script" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Write Script
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload File
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="script" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="python-script">Script Content</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setScriptContent(exampleScript)}
                    >
                      Insert Example
                    </Button>
                  </div>
                  <div className="border rounded-md overflow-hidden">
                    <Editor
                      height="300px"
                      language="python"
                      theme={isDarkMode ? "vs-dark" : "light"}
                      value={scriptContent}
                      onChange={(value) => setScriptContent(value || "")}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        automaticLayout: true,
                        tabSize: 4,
                        insertSpaces: true,
                        folding: true,
                        autoIndent: 'full',
                        formatOnPaste: true,
                        formatOnType: true,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Write your Python function here. Make sure it includes proper docstrings and error handling.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="upload" className="space-y-4">
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Upload Python File</p>
                      <p className="text-xs text-muted-foreground">
                        Select a .py file containing your Python function
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".py"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Choose File
                      </Button>
                    </div>
                  </div>

                  {selectedFile && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm font-medium">{selectedFile.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {(selectedFile.size / 1024).toFixed(1)}KB
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removeFile}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                                    {uploadedContent && (
                    <div className="space-y-2">
                      <Label>File Preview</Label>
                      <div className="border rounded-md overflow-hidden">
                        <Editor
                          height="200px"
                          language="python"
                          theme={isDarkMode ? "vs-dark" : "light"}
                          value={uploadedContent}
                          onChange={(value) => setUploadedContent(value || "")}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            lineNumbers: 'on',
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            automaticLayout: true,
                            tabSize: 4,
                            insertSpaces: true,
                            folding: true,
                            autoIndent: 'full',
                            formatOnPaste: true,
                            formatOnType: true,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddPlugin}
            disabled={!toolName || !description || (!scriptContent && !uploadedContent) || !!nameError}
          >
            Add Plugin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 