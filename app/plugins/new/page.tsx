"use client"

import * as React from "react"
import { Upload, FileText, Code, X, Plus, Save, ChevronLeft } from "lucide-react"
import Editor from '@monaco-editor/react'
import Link from "next/link"
import { useRouter } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
          setActiveTab("upload") // Switch to upload tab when file is selected
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

  const handleSavePlugin = () => {
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

    // Here you would save the plugin
    console.log('Plugin saved:', {
      name: toolName,
      description: description.trim(),
      script: currentContent.trim(),
      filename: selectedFile?.name
    })

    alert("Plugin saved successfully!")
    
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
            
            <Button variant="ghost" size="sm" asChild>
              <Link href="/plugins">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            
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
                <Save className="h-4 w-4" />
                Save Plugin
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar - Plugin Details */}
            <div className="w-80 border-r bg-muted/30 p-6 overflow-y-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Plugin Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Tool Name */}
                  <div className="space-y-2">
                    <Label htmlFor="tool-name">
                      Tool Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="tool-name"
                      placeholder="e.g., data_processor"
                      value={toolName}
                      onChange={(e) => handleToolNameChange(e.target.value)}
                      className={nameError ? "border-destructive" : ""}
                    />
                    {nameError && (
                      <p className="text-sm text-destructive">{nameError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Must be lowercase with underscores (snake_case)
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

                  {/* File Upload Section */}
                  <div className="space-y-4">
                    <Label>Upload Python File</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Upload .py file</p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".py"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          size="sm"
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
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Side - Code Editor */}
            <div className="flex-1 flex flex-col">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
                <div className="border-b p-4">
                  <TabsList>
                    <TabsTrigger value="script" className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Write Script
                    </TabsTrigger>
                    <TabsTrigger value="upload" className="flex items-center gap-2 relative">
                      <Upload className="h-4 w-4" />
                      Uploaded File
                      {selectedFile && (
                        <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">
                          {selectedFile.name.split('.')[0]}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  
                  {activeTab === "script" && (
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Python Script Editor</h3>
                        <p className="text-sm text-muted-foreground">
                          Write your Python function with proper docstrings and error handling
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setScriptContent(exampleScript)}
                      >
                        Insert Example
                      </Button>
                    </div>
                  )}
                  
                  {activeTab === "upload" && uploadedContent && (
                    <div className="mt-4">
                      <h3 className="font-medium">File Content Preview</h3>
                      <p className="text-sm text-muted-foreground">
                        Review and edit your uploaded Python file
                      </p>
                    </div>
                  )}
                </div>

                {/* Code Editor Area */}
                <div className="flex-1 relative">
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
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                          <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium">No file uploaded</p>
                          <p className="text-sm">Upload a Python file to see its content here</p>
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