"use client"

import * as React from "react"
import { Upload, Code, ArrowDownToLine } from "lucide-react"
import Editor from '@monaco-editor/react'
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function NewPluginPage() {
  const router = useRouter()
  const [toolName, setToolName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [scriptContent, setScriptContent] = React.useState("")
  const [uploadedContent, setUploadedContent] = React.useState("")
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [activeTab, setActiveTab] = React.useState("script")
  const [nameError, setNameError] = React.useState("")
  const [isDragging, setIsDragging] = React.useState(false)

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

  const handleFileSelect = (file: File) => {
    if (file.name.endsWith('.py')) {
      setSelectedFile(file)
      // Read file content
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedContent(e.target?.result as string || "")
        setActiveTab("upload") // Switch to upload tab when file is selected
      }
      reader.readAsText(file)
    } else {
      toast.error("Please select a Python (.py) file")
    }
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setUploadedContent("")
    setActiveTab("script")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }
  

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const pythonFile = files.find(file => file.name.endsWith('.py'))
    
    if (pythonFile) {
      handleFileSelect(pythonFile)
    } else {
      toast.error("Please drop a Python (.py) file")
    }
  }

  const handleSavePlugin = () => {
    if (!validateToolName(toolName)) {
      return
    }
    
    if (!description.trim()) {
      toast.error("Please provide a description for your plugin")
      return
    }

    const currentContent = activeTab === "script" ? scriptContent : uploadedContent
    if (!currentContent.trim()) {
      toast.error("Please provide Python script content")
      return
    }

    // Here you would save the plugin
    console.log('Plugin saved:', {
      name: toolName,
      description: description.trim(),
      script: currentContent.trim(),
      filename: selectedFile?.name
    })

    toast.success("Plugin saved successfully!")
    
    // Navigate back to plugins page
    router.push("/plugins")
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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-screen bg-background">
          {/* Header */}
          <header className="flex h-16 items-center gap-4 border-b px-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/plugins">Plugins</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>New Plugin</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/plugins">Cancel</Link>
              </Button>
              <Button 
                onClick={handleSavePlugin}
                disabled={!toolName || !description || (!scriptContent && !uploadedContent) || !!nameError}
                className="gap-2"
              >
                <ArrowDownToLine className="h-4 w-4" />
                Save Plugin
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Right Side - Code Editor */}
            <div className="flex-1 flex flex-col">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
                <div className="border-b p-4">
                  <TabsList>
                    <TabsTrigger value="script" className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Write Script
                    </TabsTrigger>
                    <TabsTrigger 
                      value="upload" 
                      className="flex items-center gap-2 relative cursor-pointer"
                      onClick={() => {
                        if (activeTab !== "upload") {
                          fileInputRef.current?.click()
                        }
                      }}
                    >
                      <Upload className="h-4 w-4" />
                      Upload File
                      {selectedFile && (
                        <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">
                          {selectedFile.name.split('.')[0]}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  
                  {activeTab === "script" && (
                    <div className="mt-4">
                      <h3 className="font-medium">Python Script Editor</h3>
                      <p className="text-sm text-muted-foreground">
                        Write your Python function or drag and drop a .py file
                      </p>
                    </div>
                  )}
                  
                  {activeTab === "upload" && (
                    <div className="mt-4">
                      <h3 className="font-medium">Upload Python File</h3>
                      <p className="text-sm text-muted-foreground">
                        Click to browse files or drag and drop a .py file
                      </p>
                    </div>
                  )}
                </div>

                {/* Code Editor Area with Drag and Drop */}
                <div 
                  className="flex-1 relative"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".py"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  {/* Drag overlay */}
                  {isDragging && (
                    <div className="absolute inset-0 bg-blue-50/50 border-2 border-dashed border-blue-500 z-10 dark:bg-blue-950/20">
                    </div>
                  )}

                  <TabsContent value="script" className="h-full m-0 border-0 p-0">
                    <Editor
                      height="100%"
                      language="python"
                      theme={isDarkMode ? "vs-dark" : "light"}
                      value={scriptContent}
                      onChange={(value) => setScriptContent(value || "")}
                      options={{
                        minimap: { enabled: true },
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
                        renderWhitespace: 'boundary',
                        rulers: [88], // PEP 8 line length
                      }}
                    />
                  </TabsContent>
                  
                  <TabsContent value="upload" className="h-full m-0 border-0 p-0">
                    {uploadedContent ? (
                      <Editor
                        height="100%"
                        language="python"
                        theme={isDarkMode ? "vs-dark" : "light"}
                        value={uploadedContent}
                        onChange={(value) => setUploadedContent(value || "")}
                        options={{
                          minimap: { enabled: true },
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
                          renderWhitespace: 'boundary',
                          rulers: [88], // PEP 8 line length
                        }}
                      />
                    ) : (
                      <div 
                        className="flex items-center justify-center h-full text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="text-center">
                          <Upload className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <p className="text-xl font-medium mb-2">Upload Python File</p>
                          <p className="text-sm mb-4">Click to browse files or drag and drop a .py file</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 