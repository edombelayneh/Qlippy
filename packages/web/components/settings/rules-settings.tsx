"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, FileText, ToggleLeft } from "lucide-react"
import { toast } from "sonner"
import { settingsApi } from "@/lib/api"

interface Rule {
  id: string
  description: string
  is_enabled: boolean
}

export function RulesSettings() {
  const [rules, setRules] = React.useState<Rule[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [showAddDialog, setShowAddDialog] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [ruleToDelete, setRuleToDelete] = React.useState<Rule | null>(null)
  const [newRuleDescription, setNewRuleDescription] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Load rules on component mount
  React.useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      setIsLoading(true)
      const response = await settingsApi.getRules()
      setRules(response)
    } catch (error) {
      console.error("Error loading rules:", error)
      toast.error("Failed to load rules")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRule = (rule: Rule) => {
    setRuleToDelete(rule)
    setShowDeleteDialog(true)
  }

  const confirmDeleteRule = async () => {
    if (!ruleToDelete) return
    
    try {
      setIsSubmitting(true)
      await settingsApi.deleteRule(ruleToDelete.id)
      setRules(prev => prev.filter(r => r.id !== ruleToDelete.id))
      toast.success("Rule has been removed")
      setRuleToDelete(null)
    } catch (error) {
      console.error("Error deleting rule:", error)
      toast.error("Failed to delete rule")
    } finally {
      setIsSubmitting(false)
    }
    setShowDeleteDialog(false)
  }

  const handleAddRule = async () => {
    if (!newRuleDescription.trim()) {
      toast.error("Please enter a rule description")
      return
    }

    try {
      setIsSubmitting(true)
      const response = await settingsApi.addRule(newRuleDescription.trim())
      const newRule: Rule = {
        id: response.data.id,
        description: newRuleDescription.trim(),
        is_enabled: true
      }
      setRules(prev => [...prev, newRule])
      setNewRuleDescription("")
      setShowAddDialog(false)
      toast.success("Rule has been added")
    } catch (error) {
      console.error("Error adding rule:", error)
      toast.error("Failed to add rule")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleRule = async (rule: Rule) => {
    try {
      await settingsApi.toggleRule(rule.id, !rule.is_enabled)
      setRules(prev => prev.map(r => 
        r.id === rule.id ? { ...r, is_enabled: !r.is_enabled } : r
      ))
      toast.success(`Rule ${!rule.is_enabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      console.error("Error toggling rule:", error)
      toast.error("Failed to toggle rule")
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Rules</h2>
          <p className="text-muted-foreground">
            Define custom rules that will be automatically added to your system prompt.
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Rule</DialogTitle>
              <DialogDescription>
                Add a custom rule that will guide the AI's behavior. This will be automatically included in all conversations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Enter your rule description..."
                value={newRuleDescription}
                onChange={(e) => setNewRuleDescription(e.target.value)}
                rows={4}
                className="w-full"
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddRule}
                  disabled={isSubmitting || !newRuleDescription.trim()}
                >
                  {isSubmitting ? "Adding..." : "Add Rule"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Custom Rules
          </CardTitle>
          <CardDescription>
            These rules will be automatically included in your system prompt to guide AI behavior.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No rules defined</p>
              <p className="text-sm">Add custom rules to guide AI behavior across all conversations.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-4 border rounded-lg space-y-3 ${
                    rule.is_enabled ? 'border-border' : 'border-border/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm text-foreground flex-1">
                      {rule.description}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={rule.is_enabled}
                        onCheckedChange={() => handleToggleRule(rule)}
                        className="data-[state=checked]:bg-primary"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {!rule.is_enabled && (
                    <p className="text-xs text-muted-foreground">
                      This rule is disabled and won't be included in the system prompt.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDeleteRule}
        title="Delete Rule"
        description={`Are you sure you want to delete this rule? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  )
} 