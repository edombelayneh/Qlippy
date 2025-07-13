"use client"

import * as React from "react"
import { Plus, Blocks, Trash2, Code } from "lucide-react"
import Link from "next/link"

import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { useTools } from "@/app/hooks/use-tools"
import { ConfirmationDialog } from "@/components/confirmation-dialog"

export default function ToolsPage() {
  const { tools, isLoading, error, deleteTool, toggleTool } = useTools()
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [toolToDelete, setToolToDelete] = React.useState<string | null>(null)

  const handleDeleteClick = (toolId: string) => {
    setToolToDelete(toolId)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (toolToDelete) {
      await deleteTool(toolToDelete)
      setToolToDelete(null)
      setShowDeleteDialog(false)
    }
  }

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
                  <BreadcrumbLink>Tools</BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="ml-auto">
              <Button asChild variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Link href="/tools/new">
                  <Plus className="h-4 w-4" />
                  New Tool
                </Link>
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  Tools
                </h1>
                <p className="text-muted-foreground mt-2">
                  Manage and create custom Python tools for your AI assistant
                </p>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-48" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Error State */}
              {error && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <Blocks className="h-16 w-16 mx-auto text-destructive/50 mb-4" />
                      <h3 className="text-lg font-medium mb-2">Error loading tools</h3>
                      <p className="text-muted-foreground mb-6">{error}</p>
                      <Button onClick={() => window.location.reload()}>
                        Try Again
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tools Grid */}
              {!isLoading && !error && tools.length > 0 && (
                <div className="space-y-4">
                  {tools.map((tool) => (
                    <Card key={tool.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{tool.display_name}</CardTitle>
                            </div>
                            <Badge variant="outline">
                              {tool.script_type === "file" ? "File" : "Inline"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={tool.is_enabled}
                              onCheckedChange={(checked) => toggleTool(tool.id, checked)}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(tool.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-3">{tool.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Executed {tool.execution_count} times</span>
                          {tool.filename && <span>• {tool.filename}</span>}
                          <span>• Created {new Date(tool.created_at).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !error && tools.length === 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Your Tools</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <Blocks className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No tools yet</h3>
                      <p className="text-muted-foreground mb-6">
                        Create your first custom tool to extend your AI assistant's capabilities
                      </p>
                      <Button asChild className="gap-2">
                        <Link href="/tools/new">
                          <Plus className="h-4 w-4" />
                          Create Your First Tool
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Delete Confirmation Dialog */}
          <ConfirmationDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            onConfirm={confirmDelete}
            title="Delete Tool"
            description="Are you sure you want to delete this tool? This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 