"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTheme } from "next-themes"

export function CurrentSettings() {
  const { theme } = useTheme()

  // These would ideally come from a global state or settings context
  const settings = {
    theme: theme,
    language: "English",
    model: "Default Model",
    voice: "Default Voice",
    hotword: "Enabled",
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="capitalize text-muted-foreground">{key}</span>
            <span>{value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
} 