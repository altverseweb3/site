import { Info } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

export const InfoRow = ({
  label,
  value,
  subValue,
  tooltip,
  className = "",
}: {
  label: string;
  value: string;
  subValue?: string;
  tooltip?: string;
  className?: string;
}) => (
  <div className="flex justify-between items-center py-2">
    <div className="flex items-center gap-2">
      <span className="text-[#A1A1AA] text-sm">{label}</span>
      {tooltip && (
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Info className="w-3 h-3 text-[#A1A1AA]" />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className="bg-[#18181B] border border-[#27272A] text-white text-xs px-2 py-1 rounded shadow-lg max-w-xs z-[9999]"
                sideOffset={5}
              >
                {tooltip}
                <Tooltip.Arrow className="fill-[#27272A]" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      )}
    </div>
    <div className="text-right">
      <div
        className={`text-sm font-semibold font-mono ${className || "text-[#FAFAFA]"}`}
      >
        {value}
      </div>
      {subValue && (
        <div className="text-xs font-mono text-[#A1A1AA]">{subValue}</div>
      )}
    </div>
  </div>
);
