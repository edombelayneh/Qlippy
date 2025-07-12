"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { Plus, Trash2, FileText } from "lucide-react"
import { toast } from "sonner"

interface Rule {
  id: string
  description: string
}

export function RulesSettings() {
  const [rules, setRules] = React.useState<Rule[]>([
    {
      id: "1",
      description: "Always check for proper error handling, type safety, and documentation when reviewing code",
    },
    {
      id: "2",
      description: "Use clear headings, bullet points, and code blocks for technical content in responses",
    },
    {
      id: "3",
      description: "Break down complex tasks into smaller, manageable steps with clear dependencies",
    }
  ])

  const [showAddDialog, setShowAddDialog] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [ruleToDelete, setRuleToDelete] = React.useState<Rule | null>(null)
  const [newRuleDescription, setNewRuleDescription] = React.useState("")

  const handleDeleteRule = (rule: Rule) => {
    setRuleToDelete(rule)
    setShowDeleteDialog(true)
  }

  const confirmDeleteRule = () => {
    if (ruleToDelete) {
      setRules(prev => prev.filter(r => r.id !== ruleToDelete.id))
      toast.success("Rule has been removed")
      setRuleToDelete(null)
    }
    setShowDeleteDialog(false)
  }

  const handleAddRule = () => {
    if (!newRuleDescription.trim()) {
      toast.error("Please enter a rule description")
      return
    }

    const rule: Rule = {
      id: Date.now().toString(),
      description: newRuleDescription.trim(),
    }

    setRules(prev => [...prev, rule])
    toast.success("Rule has been added")
    
    // Reset form
    setNewRuleDescription("")
    setShowAddDialog(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Rules</h2>
          <p className="text-muted-foreground">
            Define custom rules for AI behavior and response formatting.
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Rule</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Rule</DialogTitle>
              <DialogDescription>
                Create a custom rule for AI behavior and formatting.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Enter your rule description..."
                  value={newRuleDescription}
                  onChange={(e) => setNewRuleDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddRule}>
                  Add Rule
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Custom Rules ({rules.length})</CardTitle>
          <CardDescription>
            Rules that define AI behavior and response formatting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="group flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-muted-foreground">
                      {rule.description}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => handleDeleteRule(rule)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {rules.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <div className="text-lg font-medium mb-2">No rules found</div>
                <div className="text-sm">Add your first rule to get started</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDeleteRule}
        title="Delete Rule"
        description="Are you sure you want to delete this rule? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  )
} 