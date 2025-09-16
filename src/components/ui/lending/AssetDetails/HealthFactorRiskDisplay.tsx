"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, AlertTriangle, CheckCircle } from "lucide-react";
import { formatHealthFactor } from "@/utils/formatters";
import { UnifiedReserveData } from "@/types/aave";
import { Token } from "@/types/web3";
import { evmAddress } from "@aave/react";
import { useSourceToken, useSourceChain } from "@/store/web3Store";
import {
  HealthFactorPreviewResult,
  useHealthFactorPreviewOperations,
} from "@/hooks/lending/useHealthFactorPreviewOperations";

export interface HealthFactorRiskDisplayProps {
  amount?: string;
  sourceToken?: Token;
  userAddress?: string;
  market?: UnifiedReserveData;
  operation?: "borrow" | "supply" | "repay" | "withdraw";
  className?: string;
}

export default function HealthFactorRiskDisplay({
  amount,
  sourceToken,
  userAddress,
  market,
  operation = "borrow",
  className = "",
}: HealthFactorRiskDisplayProps) {
  // Get dependencies for the hook
  const storeSourceChain = useSourceChain();
  const storeSourceToken = useSourceToken();

  // Use the health factor preview operations hook
  const { previewHealthFactor } = useHealthFactorPreviewOperations({
    sourceChain: storeSourceChain,
    sourceToken: storeSourceToken,
    userWalletAddress: userAddress || null,
  });

  // Internal state for health factor preview
  const [healthFactorPreview, setHealthFactorPreview] =
    useState<HealthFactorPreviewResult | null>(null);
  const lastCalculatedAmountRef = useRef<string>("");
  const calculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewHealthFactorRef = useRef(previewHealthFactor);
  const marketRef = useRef(market);
  const sourceTokenRef = useRef(sourceToken);

  // Update refs when values change
  previewHealthFactorRef.current = previewHealthFactor;
  marketRef.current = market;
  sourceTokenRef.current = sourceToken;

  // Stable references for dependencies
  const marketAddress = market?.marketInfo?.address;
  const marketChainId = market?.marketInfo?.chain?.chainId;
  const sourceTokenAddress = sourceToken?.address;

  useEffect(() => {
    // Clear any existing timeout
    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current);
      calculationTimeoutRef.current = null;
    }

    // Clear state if we don't have required primitive props
    if (
      amount === undefined ||
      !sourceTokenAddress ||
      !userAddress ||
      !marketAddress ||
      !marketChainId
    ) {
      setHealthFactorPreview(null);
      lastCalculatedAmountRef.current = "";
      return;
    }

    // Only calculate if we have an amount and it's not zero
    if (!amount || amount === "0") {
      setHealthFactorPreview(null);
      lastCalculatedAmountRef.current = "";
      return;
    }

    // Skip calculation if amount hasn't changed
    if (lastCalculatedAmountRef.current === amount) {
      return;
    }

    const calculateHealthFactor = async () => {
      const currentMarket = marketRef.current;
      const currentSourceToken = sourceTokenRef.current;
      const currentPreviewHealthFactor = previewHealthFactorRef.current;

      if (!currentMarket || !currentSourceToken) {
        return;
      }

      try {
        lastCalculatedAmountRef.current = amount;

        const result = await currentPreviewHealthFactor({
          operation,
          market: currentMarket,
          amount,
          currency: evmAddress(currentSourceToken.address),
          useNative: false,
        });

        setHealthFactorPreview(result);
      } catch (error) {
        console.error("Health factor preview failed:", error);
        setHealthFactorPreview(null);
      }
    };

    // Debounce the calculation
    calculationTimeoutRef.current = setTimeout(calculateHealthFactor, 300);

    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
        calculationTimeoutRef.current = null;
      }
    };
  }, [
    amount,
    sourceTokenAddress,
    userAddress,
    marketChainId,
    marketAddress,
    operation,
  ]);

  const healthFactorBefore = healthFactorPreview?.healthFactorBefore;
  const healthFactorAfter = healthFactorPreview?.healthFactorAfter;
  const liquidationRisk = healthFactorPreview?.liquidationRisk || "ok";

  // Don't render if we don't have health factor data
  if (!healthFactorBefore && !healthFactorAfter) {
    return null;
  }

  if (amount !== undefined && sourceToken && userAddress && market) {
    if (
      amount &&
      amount !== "0" &&
      healthFactorPreview !== null &&
      (!healthFactorPreview.success || !healthFactorPreview.healthFactorAfter)
    ) {
      return null;
    }

    if (!amount || amount === "0") {
      return null;
    }

    if (amount && amount !== "0" && healthFactorPreview === null) {
      return null;
    }
  }
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
