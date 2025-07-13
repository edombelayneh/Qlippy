"use client"

import * as React from "react"
import {
  Blocks,
  Brain,
  Search,
  Settings,
  SquarePen
} from "lucide-react"

export function useNavigation() {
    const data = {
        teams: [
          {
            name: "Qlippy",
            logo: Brain,
            plan: "Enterprise",
          }
        ],
        navMain: [
          {
            title: "New Chat",
            url: "/chat",
            icon: SquarePen,
          },
          {
            title: "Search Chats",
            url: "/search",
            icon: Search,
          },
          {
            title: "Tools",
            url: "/tools",
            icon: Blocks,
          },
        ],
        navSecondary: [
          {
            title: "Settings",
            url: "/settings",
            icon: Settings,
          },
        ],
        favorites: [],
      }
  return data
} 