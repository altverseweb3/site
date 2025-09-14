"use client";

import React from "react";
import { ArrowRight, AlertTriangle, CheckCircle } from "lucide-react";
import { formatHealthFactor } from "@/utils/formatters";

export interface HealthFactorRiskDisplayProps {
  healthFactorBefore?: string;
  healthFactorAfter?: string;
  liquidationRisk?: "ok" | "warning" | "danger";
  className?: string;
}

export default function HealthFactorRiskDisplay({
  healthFactorBefore,
  healthFactorAfter,
  liquidationRisk = "ok",
  className = "",
}: HealthFactorRiskDisplayProps) {
  const getRiskIcon = (risk: "ok" | "warning" | "danger") => {
    switch (risk) {
      case "ok":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "danger":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getRiskLabel = (risk: "ok" | "warning" | "danger") => {
    switch (risk) {
      case "ok":
        return "safe";
      case "warning":
        return "caution";
      case "danger":
        return "liquidation risk";
      default:
        return "";
    }
  };

  const getRiskColor = (risk: "ok" | "warning" | "danger") => {
    switch (risk) {
      case "ok":
        return "text-green-500";
      case "warning":
        return "text-amber-500";
      case "danger":
        return "text-red-500";
      default:
        return "text-[#A1A1AA]";
    }
  };

  const formattedBefore = formatHealthFactor(healthFactorBefore || null);
  const formattedAfter = formatHealthFactor(healthFactorAfter || null);

  return (
    <div
      className={`bg-[#1F1F23] border border-[#27272A] rounded-lg p-4 space-y-3 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[#FAFAFA] font-medium text-sm">
          health factor impact
        </h3>
        <div className="flex items-center gap-2">
          {getRiskIcon(liquidationRisk)}
          <span
            className={`text-xs font-medium ${getRiskColor(liquidationRisk)}`}
          >
            {getRiskLabel(liquidationRisk)}
          </span>
        </div>
      </div>

      {/* Health Factor Values */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Before Value */}
          <div className="text-center">
            <div className="text-[#A1A1AA] text-xs mb-1">current</div>
            <div
              className={`text-sm font-mono font-semibold ${formattedBefore.colorClass}`}
            >
              {formattedBefore.value}
            </div>
          </div>

          {/* Arrow */}
          <ArrowRight className="w-4 h-4 text-[#A1A1AA]" />

          {/* After Value */}
          <div className="text-center">
            <div className="text-[#A1A1AA] text-xs mb-1">new</div>
            <div
              className={`text-sm font-mono font-semibold ${formattedAfter.colorClass}`}
            >
              {formattedAfter.value}
            </div>
          </div>
        </div>
      </div>

      {/* Risk Message */}
      <div className="text-[#A1A1AA] text-xs leading-relaxed">
        {liquidationRisk === "danger" && (
          <span className="text-red-400">
            this transaction will put you at risk of liquidation.
          </span>
        )}
        {liquidationRisk === "warning" && (
          <span className="text-amber-400">
            caution: health factor will be in the warning zone. consider the
            risks before proceeding.
          </span>
        )}
      </div>
    </div>
  );
}
