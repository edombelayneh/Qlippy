"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Eye, Lock, Download, Trash2 } from "lucide-react"

const privacySettings = [
  {
    name: "Data Collection",
    description: "Allow Qlippy to collect usage data for improvements",
    icon: Eye,
    enabled: true,
    category: "Analytics"
  },
  {
    name: "Auto-Save",
    description: "Automatically save your conversations and settings",
    icon: Lock,
    enabled: true,
    category: "Data"
  },
  {
    name: "Privacy Mode",
    description: "Enhanced privacy with limited data sharing",
    icon: Shield,
    enabled: false,
    category: "Security"
  },
  {
    name: "Export Data",
    description: "Download your data and conversations",
    icon: Download,
    enabled: true,
    category: "Data"
  },
  {
    name: "Delete Data",
    description: "Permanently delete your account and data",
    icon: Trash2,
    enabled: false,
    category: "Account"
  }
]

export function PrivacySettings() {
  const [settings, setSettings] = React.useState(privacySettings)

  const toggleSetting = (index: number) => {
    setSettings(prev => prev.map((setting, i) => 
      i === index ? { ...setting, enabled: !setting.enabled } : setting
    ))
  }

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = []
    }
    acc[setting.category].push(setting)
    return acc
  }, {} as Record<string, typeof settings>)

  return (
    <div className="space-y-6">
      {Object.entries(groupedSettings).map(([category, categorySettings]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-lg font-semibold">{category}</h3>
          <div className="space-y-3">
            {categorySettings.map((setting, index) => {
              const Icon = setting.icon
              const globalIndex = settings.findIndex(s => s.name === setting.name)
              
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
                          onClick={() => toggleSetting(globalIndex)}
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
        </div>
      ))}
      
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          Privacy level: <span className="font-medium">Standard</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {/* TODO: Save privacy settings */}}
        >
          Save Settings
        </Button>
      </div>
    </div>
  )
} 