"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { ProtocolOption } from "@/types/earn";
import Image from "next/image";

interface ProtocolFilterProps {
  protocols: ProtocolOption[];
  selectedProtocols: string[];
  onSelectionChange: (protocols: string[]) => void;
  className?: string;
}

const ProtocolFilter: React.FC<ProtocolFilterProps> = ({
  protocols,
  selectedProtocols,
  onSelectionChange,
  className,
}) => {
  const handleCheckedChange = (protocolId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedProtocols, protocolId]);
    } else {
      onSelectionChange(selectedProtocols.filter((id) => id !== protocolId));
    }
  };

  const selectedCount = selectedProtocols.length;
  const displayText =
    selectedCount === 0
      ? "all protocols"
      : selectedCount === 1
        ? protocols
            .find((p) => p.id === selectedProtocols[0])
            ?.name.toLowerCase() || "1 selected"
        : `${selectedCount} selected`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="h-8">
        <Button
          variant="outline"
          className={cn(
            "justify-between w-full sm:min-w-[140px] border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A] bg-[#18181B]",
            className,
          )}
        >
          <span className="truncate">{displayText}</span>
          <ChevronDownIcon className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 bg-[#18181B] border-[#27272A]"
        align="start"
      >
        {protocols.map((protocol) => (
          <DropdownMenuCheckboxItem
            key={protocol.id}
            className={`text-[#FAFAFA] focus:bg-[#27272A] focus:text-[#FAFAFA] ${
              protocol.disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            checked={selectedProtocols.includes(protocol.id)}
            onCheckedChange={
              protocol.disabled
                ? undefined
                : (checked) => handleCheckedChange(protocol.id, checked)
            }
            disabled={protocol.disabled}
          >
            <div className="flex items-center gap-2">
              <Image
                src={protocol.icon}
                alt={protocol.name}
                width={16}
                height={16}
                className="object-contain"
              />
              <span>
                {protocol.name.toLowerCase()}{" "}
                {protocol.disabled && "(coming soon)"}
              </span>
            </div>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProtocolFilter;
