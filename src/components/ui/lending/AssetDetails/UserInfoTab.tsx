import { UnifiedReserveData } from "@/types/aave";
import { TrendingUp, Shield, Zap } from "lucide-react";
import {
  formatBalance,
  formatCurrency,
  formatPercentage,
} from "@/utils/formatters";
import { InfoRow } from "@/components/ui/lending/AssetDetails/InfoRow";
import { BrandedButton } from "@/components/ui/BrandedButton";
import WithdrawAssetModal from "@/components/ui/lending/ActionModals/WithdrawAssetModal";
import RepayAssetModal from "@/components/ui/lending/ActionModals/RepayAssetModal";
import SubscriptNumber from "@/components/ui/SubscriptNumber";
import { getChainByChainId } from "@/config/chains";
import useWeb3Store from "@/store/web3Store";
import { getLendingToken } from "@/utils/lending/tokens";
import { TokenTransferState } from "@/types/web3";

interface UserInfoTabProps {
  market: UnifiedReserveData;
  userAddress?: string;

  onRepay?: (market: UnifiedReserveData, max: boolean) => void;
  tokenTransferState?: TokenTransferState;
}

export const UserInfoTab: React.FC<UserInfoTabProps> = ({
  market,
  userAddress,

  onRepay,
  tokenTransferState,
}) => {
  const userState = market.userState;
  const [supplyPosition] = market.userSupplyPositions;
  const [borrowPosition] = market.userBorrowPositions;

  // Web3 store setup for modals
  const tokensByCompositeKey = useWeb3Store(
    (state) => state.tokensByCompositeKey,
  );
  const lendingToken = getLendingToken(market, tokensByCompositeKey);
  const lendingChain = getChainByChainId(lendingToken.chainId);
  const setSourceToken = useWeb3Store((state) => state.setSourceToken);
  const setDestinationToken = useWeb3Store(
    (state) => state.setDestinationToken,
  );
  const setSourceChain = useWeb3Store((state) => state.setSourceChain);
  const setDestinationChain = useWeb3Store(
    (state) => state.setDestinationChain,
  );

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
      {/* User Positions */}
      {(supplyPosition || borrowPosition) && (
        <div className="space-y-3">
          {/* Supply Position */}
          {supplyPosition && (
            <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-green-300 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  your supply position
                </h3>
                {tokenTransferState && (
                  <WithdrawAssetModal
                    market={market}
                    userAddress={userAddress}
                    tokenTransferState={tokenTransferState}
                    healthFactor={
                      market.marketInfo.userState?.healthFactor?.toString() ||
                      null
                    }
                  >
                    <BrandedButton
                      iconName="Coins"
                      buttonText="withdraw"
                      onClick={() => {
                        setSourceChain(lendingChain);
                        setDestinationChain(lendingChain);
                        setSourceToken(lendingToken);
                        setDestinationToken(lendingToken);
                      }}
                      className="text-sm px-3 py-1 h-1/2 bg-amber-500/20 hover:bg-amber-500/30 hover:text-amber-300 text-amber-300 border-amber-500/50 hover:border-amber-500 transition-all duration-200 w-1/4"
                      iconClassName="h-3 w-3"
                    />
                  </WithdrawAssetModal>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#A1A1AA]">amount</span>
                  <div className="text-right">
                    <div className="text-sm font-mono font-semibold text-white">
                      <SubscriptNumber
                        value={supplyPosition.balance.amount.value}
                      />{" "}
                      <span className="text-xs">
                        {market.underlyingToken.symbol}
                      </span>
                    </div>
                    <div className="text-xs text-[#71717A] font-mono">
                      {formatCurrency(supplyPosition.balance.usd)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Borrow Position */}
          {borrowPosition && (
            <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-red-300 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  your borrow position
                </h3>
                {onRepay && tokenTransferState && (
                  <RepayAssetModal
                    market={market}
                    userAddress={userAddress}
                    onRepay={onRepay}
                    tokenTransferState={tokenTransferState}
                  >
                    <BrandedButton
                      iconName="Coins"
                      buttonText="repay"
                      onClick={() => {
                        setSourceChain(lendingChain);
                        setDestinationChain(lendingChain);
                        setSourceToken(lendingToken);
                        setDestinationToken(lendingToken);
                      }}
                      className="text-sm px-3 py-1 h-1/2 bg-sky-500/20 hover:bg-sky-500/30 hover:text-sky-300 text-sky-300 border-sky-500/50 hover:border-sky-500 transition-all duration-200 w-1/4"
                      iconClassName="h-3 w-3"
                    />
                  </RepayAssetModal>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#A1A1AA]">amount</span>
                  <div className="text-right">
                    <div className="text-sm font-mono font-semibold text-white">
                      <SubscriptNumber
                        value={borrowPosition.debt.amount.value}
                      />{" "}
                      <span className="text-xs">
                        {market.underlyingToken.symbol}
                      </span>
                    </div>
                    <div className="text-xs text-[#71717A] font-mono">
                      {formatCurrency(borrowPosition.debt.usd)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
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
