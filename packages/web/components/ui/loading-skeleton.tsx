import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface LoadingSkeletonProps {
  variant?: "default" | "card" | "list" | "form" | "chat" | "settings" | "sidebar"
  className?: string
  count?: number
  animated?: boolean
}

export function LoadingSkeleton({ 
  variant = "default", 
  className, 
  count = 1,
  animated = true 
}: LoadingSkeletonProps) {
  const baseClasses = animated ? "animate-pulse" : ""

  const renderVariant = () => {
    switch (variant) {
      case "card":
        return (
          <div className={cn("p-6 border rounded-lg", baseClasses, className)}>
            <div className="flex items-center space-x-4 mb-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )

      case "list":
        return (
          <div className={cn("space-y-3", className)}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className={cn("flex items-center space-x-3 p-3", baseClasses)}>
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        )

      case "form":
        return (
          <div className={cn("space-y-6", baseClasses, className)}>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-20 w-full" />
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-16" />
            </div>
          </div>
        )

      case "chat":
        return (
          <div className={cn("space-y-4", className)}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className={cn("flex space-x-3", baseClasses)}>
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )

      case "settings":
        return (
          <div className={cn("space-y-6", baseClasses, className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-96" />
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
            
            {/* Card */}
            <div className="border rounded-lg">
              <div className="p-6 border-b">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="p-6 space-y-8">
                {Array.from({ length: count || 3 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case "sidebar":
        return (
          <div className={cn("space-y-2", baseClasses, className)}>
            {/* Header */}
            <div className="p-4 border-b">
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
            
            {/* Menu Items */}
            <div className="p-2 space-y-1">
              {Array.from({ length: count || 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
            
            {/* List Section */}
            <div className="p-2">
              <Skeleton className="h-5 w-20 mb-3" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-2 p-2 mb-1">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </div>
        )

      case "default":
      default:
        return (
          <div className={cn("space-y-4", baseClasses, className)}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        )
    }
  }

  return renderVariant()
}

// Preset components for common patterns
export function CardSkeleton({ className, ...props }: Omit<LoadingSkeletonProps, "variant">) {
  return <LoadingSkeleton variant="card" className={className} {...props} />
}

export function ListSkeleton({ className, count = 3, ...props }: Omit<LoadingSkeletonProps, "variant">) {
  return <LoadingSkeleton variant="list" count={count} className={className} {...props} />
}

export function FormSkeleton({ className, ...props }: Omit<LoadingSkeletonProps, "variant">) {
  return <LoadingSkeleton variant="form" className={className} {...props} />
}

export function ChatSkeleton({ className, count = 3, ...props }: Omit<LoadingSkeletonProps, "variant">) {
  return <LoadingSkeleton variant="chat" count={count} className={className} {...props} />
}

export function SettingsSkeleton({ className, count = 3, ...props }: Omit<LoadingSkeletonProps, "variant">) {
  return <LoadingSkeleton variant="settings" count={count} className={className} {...props} />
}

export function SidebarSkeleton({ className, count = 5, ...props }: Omit<LoadingSkeletonProps, "variant">) {
  return <LoadingSkeleton variant="sidebar" count={count} className={className} {...props} />
} 