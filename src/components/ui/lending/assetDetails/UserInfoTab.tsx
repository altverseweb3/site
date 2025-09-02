import { UnifiedMarketData } from "@/types/aave";
import { TrendingUp, Shield, Zap } from "lucide-react";
import {
  formatBalance,
  formatCurrency,
  formatPercentage,
} from "@/utils/formatters";
import { InfoRow } from "@/components/ui/lending/assetDetails/InfoRow";

export const UserInfoTab: React.FC<{ market: UnifiedMarketData }> = ({
  market,
}) => {
  const userState = market.userState;

  if (!userState) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA]">
          connect wallet to view your position details
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          wallet balance
        </h3>
        <InfoRow
          label="available balance"
          value={`${formatBalance(userState.balance.amount.value)} ${market.underlyingToken.symbol}`}
          subValue={formatCurrency(userState.balance.usd)}
        />
        <InfoRow
          label="suppliable amount"
          value={`${formatBalance(userState.suppliable.amount.value)} ${market.underlyingToken.symbol}`}
          subValue={formatCurrency(userState.suppliable.usd)}
        />
        <InfoRow
          label="borrowable amount"
          value={`${formatBalance(userState.borrowable.amount.value)} ${market.underlyingToken.symbol}`}
          subValue={formatCurrency(userState.borrowable.usd)}
        />
      </div>

      <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          collateral status
        </h3>
        <InfoRow
          label="can be used as collateral"
          value={userState.canBeCollateral ? "yes" : "no"}
          className={
            userState.canBeCollateral ? "text-green-400" : "text-red-400"
          }
        />
        <InfoRow
          label="can be borrowed"
          value={userState.canBeBorrowed ? "yes" : "no"}
          className={
            userState.canBeBorrowed ? "text-green-400" : "text-red-400"
          }
        />
        <InfoRow
          label="in isolation mode"
          value={userState.isInIsolationMode ? "yes" : "no"}
          className={
            userState.isInIsolationMode ? "text-orange-400" : "text-green-400"
          }
        />
      </div>

      {userState.emode && (
        <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
          <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            e-mode configuration
          </h3>
          <InfoRow label="category" value={userState.emode.label} />
          <InfoRow
            label="max LTV"
            value={formatPercentage(userState.emode.maxLTV.value)}
          />
          <InfoRow
            label="liquidation threshold"
            value={formatPercentage(userState.emode.liquidationThreshold.value)}
          />
          <InfoRow
            label="liquidation penalty"
            value={formatPercentage(userState.emode.liquidationPenalty.value)}
          />
        </div>
      )}
    </div>
  );
};

export default UserInfoTab;
