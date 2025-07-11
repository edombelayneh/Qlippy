"use client"

import * as React from "react"
import { Plus, Blocks } from "lucide-react"
import Link from "next/link"

import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function PluginsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-screen bg-background">
          {/* Header */}
          <header className="flex h-16 items-center gap-4 border-b px-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink>Plugins</BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="ml-auto">
              <Button asChild className="gap-2">
                <Link href="/plugins/new">
                  <Plus className="h-4 w-4" />
                  New Plugin
                </Link>
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Blocks className="h-8 w-8" />
                  Plugins
                </h1>
                <p className="text-muted-foreground mt-2">
                  Manage and create custom Python tools for your AI assistant
                </p>
              </div>

              {/* Empty State for now */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Plugins</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Blocks className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No plugins yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Create your first custom plugin to extend your AI assistant's capabilities
                    </p>
                    <Button asChild>
                      <Link href="/plugins/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Plugin
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 