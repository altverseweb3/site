import { UnifiedMarketData } from "@/types/aave";
import { InfoRow } from "@/components/ui/lending/AssetDetails/InfoRow";
import { formatPercentage } from "@/utils/formatters";
import { Zap } from "lucide-react";

export const EModeInfoTab: React.FC<{ market: UnifiedMarketData }> = ({
  market,
}) => {
  const eModeInfo = market.eModeInfo;

  if (!eModeInfo || eModeInfo.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA]">
          no efficiency mode configurations available for this asset
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {eModeInfo.map((eMode) => (
        <div
          key={eMode.categoryId}
          className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4"
        >
          <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            {eMode.label} (category {eMode.categoryId})
          </h3>

          <InfoRow
            label="max LTV"
            value={formatPercentage(eMode.maxLTV.value)}
            tooltip="maximum loan-to-value ratio in this efficiency mode"
          />
          <InfoRow
            label="liquidation threshold"
            value={formatPercentage(eMode.liquidationThreshold.value)}
            tooltip="liquidation threshold when using this efficiency mode"
          />
          <InfoRow
            label="liquidation penalty"
            value={formatPercentage(eMode.liquidationPenalty.value)}
            tooltip="penalty applied during liquidation in this efficiency mode"
          />

          <div className="flex justify-between items-center py-2">
            <div className="text-[#A1A1AA] text-sm">can be collateral</div>
            <div className="text-sm font-semibold font-mono text-[#FAFAFA]">
              {eMode.canBeCollateral ? "yes" : "no"}
            </div>
          </div>

          <div className="flex justify-between items-center py-2">
            <div className="text-[#A1A1AA] text-sm">can be borrowed</div>
            <div className="text-sm font-semibold font-mono text-[#FAFAFA]">
              {eMode.canBeBorrowed ? "yes" : "no"}
            </div>
          </div>
        </div>
      ))}

      {/* E-Mode Explanation */}
      <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-3">
          about efficiency mode
        </h3>
        <p className="text-[#A1A1AA] text-xs leading-relaxed">
          efficiency mode (E-Mode) allows higher borrowing power for correlated
          assets by offering optimized risk parameters. when enabled, you can
          achieve higher LTV ratios and lower liquidation thresholds for assets
          within the same category.
        </p>
      </div>
    </div>
  );
};

export default EModeInfoTab;
