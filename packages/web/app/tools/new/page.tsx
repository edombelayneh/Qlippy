"use client"

import * as React from "react"
import { Upload, Code, ArrowDownToLine } from "lucide-react"
import Link from "next/link"

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
import { useFileDrop } from "@/app/hooks/use-file-drop"
import { useNewTool } from "@/app/hooks/use-new-tool"
import { CodeEditor } from "@/components/tools/code-editor"

export default function NewToolPage() {
  const {
    toolName,
    description,
    scriptContent,
    uploadedContent,
    selectedFile,
    activeTab,
    nameError,
    setToolName,
    setDescription,
    setScriptContent,
    setUploadedContent,
    handleFileSelect,
    removeFile,
    setActiveTab,
    handleSaveTool,
    loadExampleTemplate,
  } = useNewTool()

  const {
    isDragging,
    fileInputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange,
  } = useFileDrop({ onFileSelect: handleFileSelect })

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-screen bg-background">
          <header className="flex h-16 items-center gap-4 border-b px-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/tools">Tools</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>New Tool</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" onClick={loadExampleTemplate} className="gap-2">
                <Code className="h-4 w-4" />
                Load Example
              </Button>
              <Button variant="outline" asChild>
                <Link href="/tools">Cancel</Link>
              </Button>
              <Button
                onClick={handleSaveTool}
                disabled={
                  !toolName ||
                  !description ||
                  (!scriptContent && !uploadedContent) ||
                  !!nameError
                }
                className="gap-2"
              >
                <ArrowDownToLine className="h-4 w-4" />
                Save Tool
              </Button>
            </div>
          </header>
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 flex flex-col">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex flex-col flex-1"
              >
                <div className="border-b p-4">
                  <TabsList>
                    <TabsTrigger
                      value="script"
                      className="flex items-center gap-2"
                    >
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
                        <div className="group/file ml-1 relative">
                          <Badge
                            variant="secondary"
                            className="text-xs h-4 px-1 pr-5"
                          >
                            {selectedFile.name.split(".")[0]}
                          </Badge>
                          <button
                            className="absolute right-0.5 top-0.5 h-3 w-3 rounded-sm bg-muted-foreground/20 opacity-0 group-hover/file:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFile()
                            }}
                            title="Remove file"
                          >
                            <span className="text-xs leading-none">×</span>
                          </button>
                        </div>
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
                <div
                  className="flex-1 relative"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".py"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  {isDragging && (
                    <div className="absolute inset-0 bg-blue-50/50 border-2 border-dashed border-blue-500 z-10 dark:bg-blue-950/20"></div>
                  )}

                  <TabsContent
                    value="script"
                    className="h-full m-0 border-0 p-0"
                  >
                    <CodeEditor
                      value={scriptContent}
                      onChange={setScriptContent}
                    />
                  </TabsContent>

                  <TabsContent
                    value="upload"
                    className="h-full m-0 border-0 p-0"
                  >
                    {uploadedContent ? (
                      <CodeEditor
                        value={uploadedContent}
                        onChange={setUploadedContent}
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center h-full text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="text-center">
                          <Upload className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <p className="text-xl font-medium mb-2">
                            Upload Python File
                          </p>
                          <p className="text-sm mb-4">
                            Click to browse files or drag and drop a .py file
                          </p>
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