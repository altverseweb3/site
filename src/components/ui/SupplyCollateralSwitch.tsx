import React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const SupplyCollateralSwitch = ({
  isCollateral = false,
  onToggle = () => {},
  className = "",
}) => {
  return (
    <SwitchPrimitives.Root
      checked={isCollateral}
      onCheckedChange={() => onToggle()}
      className={cn(
        "inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      style={{
        backgroundColor: isCollateral ? "#61410B" : "#374151", // brown : gray-700
      }}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-amber-500 shadow-lg ring-0 transition-transform",
          isCollateral ? "translate-x-4" : "translate-x-0",
        )}
        style={{
          backgroundColor: "#F59E0B", // amber-500
        }}
      />
    </SwitchPrimitives.Root>
  );
};

export default SupplyCollateralSwitch;
