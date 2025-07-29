"use client";
import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/ToggleGroup";
import Image from "next/image";
import { getTokenGradient } from "@/utils/ui/uiHelpers";
import { Chain } from "@/types/web3";

interface ChainPickerProps {
  type: "single" | "multiple";
  value: string | string[]; // single chain ID or array of chain IDs
  onSelectionChange: (value: string | string[]) => void;
  chains: Chain[];
  size?: "sm" | "md" | "lg";
  className?: string;
}

const ChainPicker: React.FC<ChainPickerProps> = ({
  type,
  value,
  onSelectionChange,
  chains,
  size = "md",
  className = "",
}) => {
  const sizeConfig = {
    sm: {
      button: "h-8 w-8 p-1",
      image: 16,
      blur: "blur-[20px]",
      mobileBlur: "blur-[8px]",
      titleText: "text-xs",
      infoText: "text-xs",
    },
    md: {
      button: "h-10 w-10 p-1.5",
      image: 20,
      blur: "blur-[14px]",
      mobileBlur: "blur-[10px]",
      titleText: "text-xs",
      infoText: "text-xs",
    },
    lg: {
      button: "h-12 w-12 p-2",
      image: 24,
      blur: "blur-[16px]",
      mobileBlur: "blur-[12px]",
      titleText: "text-sm",
      infoText: "text-sm",
    },
  };

  const config = sizeConfig[size];
  const selectedChains = Array.isArray(value) ? value : value ? [value] : [];

  const handleToggleChange = (newValue: string | string[]) => {
    if (type === "single") {
      // single select
      onSelectionChange(
        typeof newValue === "string" ? newValue : newValue[0] || "",
      );
    } else {
      // multiple select
      onSelectionChange(
        Array.isArray(newValue) ? newValue : [newValue].filter(Boolean),
      );
    }
  };

  return (
    <div className={`mb-3 pb-3 ${className}`}>
      <div className="flex flex-col space-y-2">
        {/* Desktop */}
        <div className="hidden sm:block">
          {type === "single" ? (
            <ToggleGroup
              type="single"
              value={typeof value === "string" ? value : ""}
              onValueChange={handleToggleChange}
              variant="outline"
              className="justify-evenly flex-wrap gap-1.5 w-full"
            >
              {chains.map((chain) => {
                const isSelected = selectedChains.includes(chain.id);
                return (
                  <ToggleGroupItem
                    key={chain.id}
                    value={chain.id}
                    aria-label={`Select ${chain.name} network`}
                    className={`relative ${config.button} overflow-hidden transition-all duration-200 hover:scale-105 flex items-center justify-center focus:outline-none focus:ring-0`}
                  >
                    <Image
                      src={isSelected ? chain.brandedIcon : chain.icon}
                      alt={chain.name}
                      width={config.image}
                      height={config.image}
                      className="object-contain relative z-10"
                    />
                    {isSelected && (
                      <div
                        className={`pointer-events-none absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-full bg-gradient-to-r ${getTokenGradient(
                          chain.chainTokenSymbol,
                        )} opacity-60 ${config.blur} filter`}
                      />
                    )}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          ) : (
            <ToggleGroup
              type="multiple"
              value={Array.isArray(value) ? value : []}
              onValueChange={handleToggleChange}
              variant="outline"
              className="justify-evenly flex-wrap gap-1.5 w-full"
            >
              {chains.map((chain) => {
                const isSelected = selectedChains.includes(chain.id);
                return (
                  <ToggleGroupItem
                    key={chain.id}
                    value={chain.id}
                    aria-label={`Toggle ${chain.name} network`}
                    className={`relative ${config.button} overflow-hidden transition-all duration-200 hover:scale-105 flex items-center justify-center focus:outline-none focus:ring-0`}
                  >
                    <Image
                      src={isSelected ? chain.brandedIcon : chain.icon}
                      alt={chain.name}
                      width={config.image}
                      height={config.image}
                      className="object-contain relative z-10"
                    />
                    {isSelected && (
                      <div
                        className={`pointer-events-none absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-full bg-gradient-to-r ${getTokenGradient(
                          chain.chainTokenSymbol,
                        )} opacity-60 ${config.blur} filter`}
                      />
                    )}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          )}
        </div>

        {/* Mobile*/}
        <div className="sm:hidden">
          <div className="flex overflow-x-auto pb-1 -mx-2 px-2 scrollbar-hide">
            <div className="flex space-x-2 min-w-max">
              {chains.map((chain) => {
                const isSelected = selectedChains.includes(chain.id);
                return (
                  <button
                    key={chain.id}
                    onClick={() => {
                      if (type === "single") {
                        if (!isSelected) {
                          handleToggleChange(chain.id);
                        }
                      } else {
                        const newSelection = isSelected
                          ? selectedChains.filter((id) => id !== chain.id)
                          : [...selectedChains, chain.id];
                        handleToggleChange(newSelection);
                      }
                    }}
                    aria-label={`${type === "multiple" ? "Toggle" : "Select"} ${chain.name} network`}
                    className={`
                      relative ${config.button} rounded-lg overflow-hidden 
                      transition-all duration-200 active:scale-95
                      flex-shrink-0 flex items-center justify-center
                      focus:outline-none focus:ring-0
                      ${type === "single" && isSelected ? "cursor-default" : "cursor-pointer"}
                      ${
                        isSelected
                          ? "border-zinc-400 bg-zinc-800/50"
                          : "border-zinc-700 bg-zinc-800/20 hover:border-zinc-600"
                      }
                    `}
                  >
                    <Image
                      src={isSelected ? chain.brandedIcon : chain.icon}
                      alt={chain.name}
                      width={config.image}
                      height={config.image}
                      className="object-contain relative z-10"
                    />
                    {isSelected && (
                      <div
                        className={`pointer-events-none absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-full bg-gradient-to-r ${getTokenGradient(
                          chain.chainTokenSymbol,
                        )} opacity-50 ${config.mobileBlur} filter`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChainPicker;
