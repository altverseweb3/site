import React from "react";
import { formatPercentage } from "@/utils/formatters";
interface HorizontalProgressBarProps {
  current: number;
  max: number;
  label: string;
  primaryValue: string;
  secondaryValue: string;
  showPercentage?: boolean;
  color?: "green" | "sky" | "amber" | "red";
}

const HorizontalProgressBar: React.FC<HorizontalProgressBarProps> = ({
  current,
  max,
  label,
  primaryValue,
  secondaryValue,
  showPercentage = true,
  color = "green",
}) => {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;

  const colorClass = {
    bg: `bg-${color}-500/10`,
    fill: `bg-${color}-500`,
    border: `border-${color}-500/30`,
    text: `text-${color}-400`,
    percentage: `text-${color}-400`,
  };

  return (
    <div className="space-y-3">
      {/* Header with label and percentage */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-zinc-300">{label}</span>
        {showPercentage && (
          <span
            className={`text-sm font-semibold font-mono ${colorClass.percentage}`}
          >
            {formatPercentage(percentage)}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div
        className={`relative h-4 rounded-lg border ${colorClass.border} ${colorClass.bg} overflow-hidden`}
      >
        {/* Background track */}
        <div className="absolute inset-0 bg-zinc-800/50 rounded-lg" />

        {/* Progress fill */}
        <div
          className={`h-full ${colorClass.fill} rounded-lg transition-all duration-700 ease-out relative`}
          style={{ width: `${percentage}%` }}
        >
          {/* Subtle shine effect */}
          <div className="absolute inset-0 bg-white/10 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Values display */}
      <div className="flex justify-between items-center text-xs">
        <div className="flex flex-col space-y-1">
          <span className={`font-medium font-mono ${colorClass.text}`}>
            {primaryValue}
          </span>
          <span className="text-zinc-500 font-mono">{secondaryValue}</span>
        </div>
      </div>
    </div>
  );
};

export default HorizontalProgressBar;
