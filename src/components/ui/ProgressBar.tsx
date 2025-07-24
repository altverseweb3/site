"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  label?: string;
  color?: "amber" | "blue" | "sky" | "red" | "green" | "yellow";
  size?: "sm" | "md" | "lg";
  showThumb?: boolean;
  disabled?: boolean;
  className?: string;
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value,
      label,
      color = "amber",
      size = "md",
      showThumb = false,
      disabled = true,
      className,
      ...props
    },
    ref,
  ) => {
    const clampedValue = Math.min(Math.max(value, 0), 100);

    const sizeClasses = {
      sm: "h-1.5",
      md: "h-2",
      lg: "h-3",
    };

    const colorClasses = {
      amber: {
        bg: "bg-amber-500",
        track: "bg-zinc-800",
      },
      blue: {
        bg: "bg-blue-500",
        track: "bg-zinc-800",
      },
      sky: {
        bg: "bg-sky-500",
        track: "bg-zinc-800",
      },
      red: {
        bg: "bg-red-500",
        track: "bg-zinc-800",
      },
      green: {
        bg: "bg-green-500",
        track: "bg-zinc-800",
      },
      yellow: {
        bg: "bg-yellow-500",
        track: "bg-zinc-800",
      },
    };

    const thumbClasses =
      showThumb && !disabled
        ? "relative after:absolute after:top-1/2 after:-translate-y-1/2 after:right-0 after:w-3 after:h-3 after:bg-white after:rounded-full after:border after:border-zinc-700"
        : "";

    return (
      <div
        ref={ref}
        className={cn("relative flex w-full items-center", className)}
        {...props}
      >
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-full",
            sizeClasses[size],
            colorClasses[color].track,
            thumbClasses,
          )}
        >
          <div
            className={cn(
              "h-full transition-all duration-300 rounded-full",
              colorClasses[color].bg,
            )}
            style={{ width: `${clampedValue}%` }}
          />
        </div>
        {label && <span className="ml-2 text-sm text-zinc-400">{label}</span>}
      </div>
    );
  },
);

ProgressBar.displayName = "ProgressBar";

export { ProgressBar };
