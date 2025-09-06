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

export interface LendingSortOption {
  label: string;
  value: string;
  column: string;
  direction: "asc" | "desc";
  applicableTo: string[]; // markets, supply-available, supply-open, borrow-available, borrow-open
}

interface LendingSortDropdownProps {
  value?: string;
  onSortChange: (column: string, direction: "asc" | "desc") => void;
  activeSection: string; // markets, dashboard etc
  activeSubSection?: string; // supply-available, supply-open, borrow-available, borrow-open
  className?: string;
}

const lendingSortOptions: LendingSortOption[] = [
  // Supply APY (decreasing) - applies to markets, supply available, supply open
  {
    label: "supply APY",
    value: "supply-apy-desc",
    column: "supplyApy",
    direction: "desc",
    applicableTo: ["markets", "supply-available", "supply-open", "dashboard"],
  },
  // Borrow APY (increasing) - applies to markets, borrow available
  {
    label: "borrow APY",
    value: "borrow-apy-asc",
    column: "borrowApy",
    direction: "asc",
    applicableTo: ["markets", "borrow-available", "borrow-open", "dashboard"],
  },
  // Supplied Market Cap (USD value)
  {
    label: "supplied $",
    value: "supplied-mc-desc",
    column: "suppliedMarketCap",
    direction: "desc",
    applicableTo: ["markets", "supply-available", "dashboard"],
  },
  // Borrowed Market Cap (USD value)
  {
    label: "borrowed $",
    value: "borrowed-mc-desc",
    column: "borrowedMarketCap",
    direction: "desc",
    applicableTo: ["markets", "dashboard"],
  },
  // Borrow Available (decreasing)
  {
    label: "borr. $ avail.",
    value: "borrow-available-desc",
    column: "borrowAvailable",
    direction: "desc",
    applicableTo: ["borrow-available", "dashboard"],
  },
  // Value Supplied (user's supplied value)
  {
    label: "value suppl.",
    value: "value-supplied-desc",
    column: "userSuppliedValue",
    direction: "desc",
    applicableTo: ["supply-open", "dashboard"],
  },
  // Value Borrowed (user's borrowed value)
  {
    label: "value borr.",
    value: "value-borrowed-desc",
    column: "userBorrowedValue",
    direction: "desc",
    applicableTo: ["borrow-open", "dashboard"],
  },
];

const LendingSortDropdown: React.FC<LendingSortDropdownProps> = ({
  value,
  onSortChange,
  activeSection,
  activeSubSection,
  className,
}) => {
  // Filter options based on active section/subsection
  const availableOptions = lendingSortOptions.filter((option) => {
    if (activeSubSection) {
      return option.applicableTo.includes(activeSubSection);
    }
    return option.applicableTo.includes(activeSection);
  });

  const currentSort = value
    ? availableOptions.find((option) => option.value === value)
    : null;

  const handleSortSelect = (option: LendingSortOption) => {
    onSortChange(option.column, option.direction);
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
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-32 bg-[#18181B] border-[#27272A]"
      >
        {availableOptions.map((option) => (
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

export default LendingSortDropdown;
