"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Button } from "@/components/ui/Button";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SortOption {
  label: string;
  value: string;
  column: string;
  direction: "asc" | "desc";
}

interface SortDropdownProps {
  value?: string;
  onSortChange: (column: string, direction: "asc" | "desc") => void;
  onMultiSort?: (sortValue: string) => void;
  className?: string;
}

const sortOptions: SortOption[] = [
  { label: "apy", value: "apy-desc", column: "apy", direction: "desc" },
  { label: "tvl", value: "tvl-desc", column: "tvl", direction: "desc" },
  {
    label: "apy, tvl",
    value: "apy-desc-tvl-desc",
    column: "apy",
    direction: "desc",
  },
  {
    label: "tvl, apy",
    value: "tvl-desc-apy-desc",
    column: "tvl",
    direction: "desc",
  },
];

const SortDropdown: React.FC<SortDropdownProps> = ({
  value,
  onSortChange,
  onMultiSort,
  className,
}) => {
  const currentSort = value
    ? sortOptions.find((option) => option.value === value)
    : null;

  const handleSortSelect = (option: SortOption) => {
    if (option.value.includes("-") && option.value.split("-").length > 2) {
      // Multi-column sort
      onMultiSort?.(option.value);
    } else {
      // Single column sort
      onSortChange(option.column, option.direction);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 border-[#27272A] bg-[#18181B] text-[#FAFAFA] hover:bg-[#27272A] focus:border-amber-500/80 focus:ring-amber-500/80 justify-between",
            className,
          )}
        >
          <span className="text-sm text-left">
            {currentSort ? currentSort.label : "sort by"}
          </span>
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-32 bg-[#18181B] border-[#27272A]"
      >
        {sortOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSortSelect(option)}
            className="text-[#FAFAFA] hover:bg-[#27272A] cursor-pointer"
          >
            <span className="text-sm">{option.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SortDropdown;
