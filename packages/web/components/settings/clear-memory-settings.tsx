"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { useConversations } from "@/app/hooks/use-conversations"
import { settingsApi } from "@/lib/api"
import { toast } from "sonner"
import { Loader2, Database, MessageSquare, FileText } from "lucide-react"

export function ClearMemorySettings() {
  const { conversations, clearAllConversations } = useConversations()
  const [showClearDialog, setShowClearDialog] = React.useState(false)
  const [isClearing, setIsClearing] = React.useState(false)
  const [clearRagIndex, setClearRagIndex] = React.useState(false)
  const [ragStats, setRagStats] = React.useState<{
    total_directories: number;
    total_files: number;
    indexed_files: number;
    total_chunks: number;
    active_conversation_contexts: number;
  } | null>(null)
  const [loadingRagStats, setLoadingRagStats] = React.useState(true)

  // Load RAG stats on component mount
  React.useEffect(() => {
    const loadRagStats = async () => {
      try {
        setLoadingRagStats(true)
        const stats = await settingsApi.getRagIndexStats()
        setRagStats(stats)
      } catch (error) {
        console.error("Failed to load RAG stats:", error)
        // Don't show error toast for RAG stats, as RAG might not be set up
      } finally {
        setLoadingRagStats(false)
      }
    }

    loadRagStats()
  }, [])

  const handleClearAllChats = async () => {
    setIsClearing(true)
    try {
      // Clear conversations
      await clearAllConversations()
      
      // Clear RAG index if requested
      if (clearRagIndex && ragStats && ragStats.total_chunks > 0) {
        try {
          await settingsApi.clearRagIndex()
          toast.success("RAG index cleared successfully")
          // Reload RAG stats
          const newStats = await settingsApi.getRagIndexStats()
          setRagStats(newStats)
        } catch (error) {
          console.error("Failed to clear RAG index:", error)
          toast.error("Failed to clear RAG index")
        }
      }
      
      setShowClearDialog(false)
      window.location.reload() // Reload page after clearing
    } catch (error) {
      // Error handling is done in the clearAllConversations function
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Clear Memory</h2>
        <p className="text-muted-foreground mb-6">
          Reset chat history, clear file indexes, and manage stored data.
        </p>
      </div>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chat History
            </CardTitle>
            <CardDescription>
              Clear all conversation history and start fresh. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} will be deleted
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setShowClearDialog(true)}
                disabled={conversations.length === 0 || isClearing}
              >
                {isClearing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  "Clear All Chats"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              RAG Index
            </CardTitle>
            <CardDescription>
              File indexes and embeddings used for context retrieval in conversations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRagStats ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading index statistics...
              </div>
            ) : ragStats && ragStats.total_chunks > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Directories</div>
                    <div className="text-muted-foreground">{ragStats.total_directories}</div>
                  </div>
                  <div>
                    <div className="font-medium">Files</div>
                    <div className="text-muted-foreground">{ragStats.indexed_files} / {ragStats.total_files}</div>
                  </div>
                  <div>
                    <div className="font-medium">Chunks</div>
                    <div className="text-muted-foreground">{ragStats.total_chunks.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="font-medium">Active Contexts</div>
                    <div className="text-muted-foreground">{ragStats.active_conversation_contexts}</div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    try {
                      await settingsApi.clearRagIndex()
                      toast.success("RAG index cleared successfully")
                      const newStats = await settingsApi.getRagIndexStats()
                      setRagStats(newStats)
                    } catch (error) {
                      toast.error("Failed to clear RAG index")
                    }
                  }}
                  className="w-full"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Clear RAG Index
                </Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No indexed files found. RAG index is empty.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmationDialog
        open={showClearDialog}
        onOpenChange={setShowClearDialog}
        onConfirm={handleClearAllChats}
        title="Clear all conversations?"
        description={
          <div className="space-y-4">
            <p>
              Are you sure you want to delete all {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}? This action cannot be undone.
            </p>
            {ragStats && ragStats.total_chunks > 0 && (
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="clear-rag-index"
                  checked={clearRagIndex}
                  onCheckedChange={(checked) => setClearRagIndex(checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="clear-rag-index"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Also clear RAG index
                  </label>
                  <p className="text-xs text-muted-foreground">
                    This will remove all indexed files and embeddings ({ragStats.total_chunks.toLocaleString()} chunks from {ragStats.indexed_files} files)
                  </p>
                </div>
              </div>
            )}
          </div>
        }
        confirmText="Clear All"
        cancelText="Cancel"
      />
    </div>
  )
} 