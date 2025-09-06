"use client";

import React from "react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface AssetFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  mobilePlaceholder?: string;
}

const AssetFilter: React.FC<AssetFilterProps> = ({
  value,
  onChange,
  className,
  placeholder = "filter by asset",
  mobilePlaceholder,
}) => {
  return (
    <>
      <Input
        placeholder={mobilePlaceholder || placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-8 border-[#27272A] bg-[#18181B] text-[#FAFAFA] placeholder:text-[#A1A1AA] focus:border-amber-500/80 focus:ring-amber-500/80 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:hidden",
          className,
        )}
      />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-8 border-[#27272A] bg-[#18181B] text-[#FAFAFA] placeholder:text-[#A1A1AA] focus:border-amber-500/80 focus:ring-amber-500/80 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 hidden sm:block",
          className,
        )}
      />
    </>
  );
};

export default AssetFilter;
