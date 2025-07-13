"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, MessageSquare, Sparkles, Zap } from "lucide-react"

const notificationTypes = [
  {
    name: "Chat Messages",
    description: "Get notified when you receive new messages",
    icon: MessageSquare,
    enabled: true
  },
  {
    name: "AI Responses",
    description: "Notifications for AI assistant responses",
    icon: Sparkles,
    enabled: true
  },
  {
    name: "System Updates",
    description: "Important system and security updates",
    icon: Zap,
    enabled: false
  },
  {
    name: "Reminders",
    description: "Daily reminders and scheduled notifications",
    icon: Bell,
    enabled: true
  }
]

export function NotificationSettings() {
  const [settings, setSettings] = React.useState(notificationTypes)

  const toggleSetting = (index: number) => {
    setSettings(prev => prev.map((setting, i) => 
      i === index ? { ...setting, enabled: !setting.enabled } : setting
    ))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {settings.map((setting, index) => {
          const Icon = setting.icon
          
          return (
            <Card key={setting.name} className="transition-all duration-200 hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{setting.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {setting.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {setting.enabled && (
                      <Badge variant="secondary">Active</Badge>
                    )}
                    <Button
                      variant={setting.enabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleSetting(index)}
                    >
                      {setting.enabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          Active notifications: <span className="font-medium">{settings.filter(s => s.enabled).length}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {/* TODO: Save notification settings */}}
        >
          Save Settings
        </Button>
      </div>
    </div>
  )
} 