import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function ClearMemorySettings() {
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
            <CardTitle>Chat History</CardTitle>
            <CardDescription>
              Clear all conversation history and start fresh.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" size="sm">
              Clear All Chats
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>File Index Cache</CardTitle>
            <CardDescription>
              Reset the RAG index for uploaded files and documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" size="sm">
              Clear File Index
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 