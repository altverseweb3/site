"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TAB_CONFIG } from "@/config/tabs";
import { Tab } from "@/types/ui";
import { cn } from "@/lib/utils";

interface MainNavProps {
  onNavigate: () => void;
}

export function MainNav({ onNavigate }: MainNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentTab = pathname.split("/").pop() as Tab;

  const handleNavigation = (value: Tab, disabled?: boolean) => {
    if (!disabled) {
      router.push(`/${value}`);
      onNavigate(); // Call the close function after navigation
    }
  };

  return (
    <>
      {(Object.entries(TAB_CONFIG) as [Tab, (typeof TAB_CONFIG)[Tab]][]).map(
        ([value, config]) => (
          <Button
            key={value}
            variant="ghost"
            disabled={config.disabled}
            title={config.disabledMessage}
            className={cn(
              "w-full lg:w-auto text-sm font-medium transition-colors bg-transparent justify-start lg:justify-center",
              currentTab === value
                ? "text-amber-500 hover:text-amber-400 hover:bg-transparent"
                : config.disabled
                  ? "text-zinc-600" // Use default disabled styling
                  : "text-zinc-50 hover:text-zinc-200 hover:bg-transparent",
            )}
            onClick={() => handleNavigation(value, config.disabled)}
          >
            {config.label}
          </Button>
        ),
      )}
    </>
  );
}
