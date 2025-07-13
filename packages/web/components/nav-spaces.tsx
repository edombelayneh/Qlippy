"use client"

import * as React from "react"
import { type LucideIcon } from "lucide-react"
import { Folder, Plus } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
} from "@/components/ui/sidebar"

interface Space {
  id: string
  name: string
  icon: string
  color: string
  conversationCount?: number
}

interface NavSpacesProps {
  spaces: Space[]
  selectedSpace: string | null
  onSpaceSelect: (spaceId: string | null) => void
  onAddSpace?: () => void
  className?: string
}

export function NavSpaces({
  spaces,
  selectedSpace,
  onSpaceSelect,
  onAddSpace,
  className,
}: NavSpacesProps) {
  return (
    <SidebarGroup className={className}>
      <SidebarGroupLabel>Spaces</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {/* All Spaces option */}
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              isActive={selectedSpace === null}
              onClick={() => onSpaceSelect(null)}
            >
              <div className="flex items-center">
                <Folder className="h-4 w-4" />
                <span>All Spaces</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Individual Spaces */}
          {spaces.map((space) => (
            <SidebarMenuItem key={space.id}>
              <SidebarMenuButton 
                asChild 
                isActive={selectedSpace === space.id}
                onClick={() => onSpaceSelect(space.id)}
              >
                <div className="flex items-center">
                  <span className="mr-2">{space.icon}</span>
                  <span>{space.name}</span>
                  {space.conversationCount !== undefined && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {space.conversationCount}
                    </span>
                  )}
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          {/* Add Space Button */}
          {onAddSpace && (
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                onClick={onAddSpace}
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
              >
                <div className="flex items-center">
                  <Plus className="h-4 w-4" />
                  <span>Add Space</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
} 