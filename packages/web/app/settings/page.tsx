"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { useSettings } from "@/app/hooks/use-settings"
import { SettingsCategory } from "@/app/hooks/use-settings"
import { useConversations } from "@/app/hooks/use-conversations"

export default function SettingsPage() {
  const {
    settingsCategories,
    activeCategory,
    setActiveCategory,
    ActiveSettingsComponent,
  } = useSettings()
  
  const { conversations, activeConversationId } = useConversations()

  return (
    <SidebarProvider>
      <AppSidebar 
        conversations={conversations}
        activeConversationId={activeConversationId}
      />
      <SidebarInset>
        <div className="flex flex-col h-screen bg-background">
          <div className="flex flex-1 overflow-hidden">
            <div className="w-80 border-r bg-muted/20">
              <div className="p-4">
                <h1 className="text-xl font-semibold mb-4">Settings</h1>
                <div className="h-[calc(100vh-8rem)] overflow-y-auto">
                  <div className="space-y-1">
                    {settingsCategories.map((category: SettingsCategory) => {
                      const Icon = category.icon
                      const isActive = activeCategory === category.id

                      return (
                        <button
                          key={category.id}
                          onClick={() => setActiveCategory(category.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="font-medium">{category.title}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                <div className="max-w-4xl">
                  <ActiveSettingsComponent />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 