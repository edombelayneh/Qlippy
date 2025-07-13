"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface Space {
  id: string
  name: string
  icon: string
  color: string
}

interface AddSpaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddSpace: (space: Omit<Space, 'id'>) => void
}

const availableIcons = [
  "👤", "💼", "🚀", "🎨", "📚", "💻", "🎵", "🏠", "🌱", "💰", 
  "🎬", "🏃", "🍳", "✈️", "🎯", "💡", "🔧", "📊", "🎪", "🌟"
]

const availableColors = [
  { name: "Blue", class: "bg-blue-100 text-blue-800" },
  { name: "Green", class: "bg-green-100 text-green-800" },
  { name: "Purple", class: "bg-purple-100 text-purple-800" },
  { name: "Orange", class: "bg-orange-100 text-orange-800" },
  { name: "Red", class: "bg-red-100 text-red-800" },
  { name: "Yellow", class: "bg-yellow-100 text-yellow-800" },
  { name: "Pink", class: "bg-pink-100 text-pink-800" },
  { name: "Indigo", class: "bg-indigo-100 text-indigo-800" },
  { name: "Teal", class: "bg-teal-100 text-teal-800" },
  { name: "Gray", class: "bg-gray-100 text-gray-800" }
]

export function AddSpaceDialog({
  open,
  onOpenChange,
  onAddSpace
}: AddSpaceDialogProps) {
  const [name, setName] = React.useState("")
  const [selectedIcon, setSelectedIcon] = React.useState("👤")
  const [selectedColor, setSelectedColor] = React.useState(availableColors[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onAddSpace({
        name: name.trim(),
        icon: selectedIcon,
        color: selectedColor.class
      })
      // Reset form
      setName("")
      setSelectedIcon("👤")
      setSelectedColor(availableColors[0])
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Space</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Space Name */}
          <div className="space-y-2">
            <Label htmlFor="space-name">Space Name</Label>
            <Input
              id="space-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter space name..."
              required
            />
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-10 gap-2 max-h-32 overflow-y-auto">
              {availableIcons.map((icon) => (
                <Button
                  key={icon}
                  type="button"
                  variant={selectedIcon === icon ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0 text-lg"
                  onClick={() => setSelectedIcon(icon)}
                >
                  {icon}
                </Button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-5 gap-2">
              {availableColors.map((color) => (
                <Button
                  key={color.name}
                  type="button"
                  variant={selectedColor.name === color.name ? "default" : "outline"}
                  size="sm"
                  className="h-8"
                  onClick={() => setSelectedColor(color)}
                >
                  <Badge className={`${color.class} text-xs`}>
                    {color.name}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Badge className={selectedColor.class}>
                  <span className="mr-1">{selectedIcon}</span>
                  {name || "Space Name"}
                </Badge>
              </div>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create Space
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 