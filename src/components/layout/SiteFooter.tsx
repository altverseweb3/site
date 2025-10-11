"use client";

import { SocialIcon } from "react-social-icons";
import Terms from "@/components/ui/Terms";

export function SiteFooter() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t bg-background z-50">
      <div className="mx-auto flex h-10 items-center px-2 sm:px-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
          <span>© {new Date().getFullYear()} altverse.</span>
          <Terms>
            <button className="underline hover:text-foreground transition-colors">
              terms of service.
            </button>
          </Terms>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <SocialIcon
            url="https://x.com/altverseweb3"
            bgColor="#0A0A0B"
            fgColor="#A6A6A9"
            style={{ height: 24, width: 24 }}
            className="sm:w-7 sm:h-7"
          />

          <SocialIcon
            url="https://t.me/altverseweb3"
            bgColor="#0A0A0B"
            fgColor="#A6A6A9"
            style={{ height: 24, width: 24 }}
            className="sm:w-7 sm:h-7"
          />
        </div>
      </div>
    </footer>
  );
}
