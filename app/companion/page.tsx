"use client"

import * as React from "react"
import Image from "next/image"
import { CompanionChat } from "@/components/companion-chat"

export default function CompanionPage() {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (window.api && window.api.send) {
          window.api.send("close-companion-window");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleOpenMainApp = () => {
    if (window.api && window.api.send) {
      window.api.send("open-main-from-companion");
    }
  }

  // We don't render anything until the component is mounted on the client.
  // This prevents any SSR/hydration mismatch issues.
  if (!isMounted) {
    return null;
  }

  return (
    <div className="h-screen w-screen bg-transparent flex flex-col items-center p-4">
      <div className="flex-1 w-full max-w-sm flex flex-col justify-end overflow-hidden">
        <CompanionChat />
      </div>
      <div 
        className="w-36 h-36 cursor-pointer self-center flex-shrink-0"
        onClick={handleOpenMainApp}
        title="Open Main App"
      >
        <Image 
          src="/clippy-avatar.png" 
          alt="Qlippy Assistant" 
          width={144} 
          height={144}
          className="animate-glow"
        />
      </div>
    </div>
  )
} 