"use client";

import {
  useUserSupplies,
  useUserBorrows,
  useUserMarketState,
  evmAddress,
  chainId,
} from "@aave/react";
import { Suspense, Component, ReactNode } from "react";

// Hardcoded example data - you'll need to adjust these based on your actual markets
const EXAMPLE_USER = evmAddress("0xc6165A271f5cB5960c4554a8b44fCf3C75fa7F6C");
const ETHEREUM_MAINNET_MARKET = evmAddress(
  "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
);
const CHAIN_ID = chainId(42161); // Ethereum mainnet

// You'll need to define your markets - this is a placeholder
const markets = [{ address: ETHEREUM_MAINNET_MARKET, chainId: CHAIN_ID }];

// Error Boundary for handling suspense errors
class PositionsErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function HealthFactorBadge({ healthFactor }: { healthFactor: string | null }) {
  if (!healthFactor) {
    return (
      <span className="inline-block px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600">
        No borrows
      </span>
    );
  }

  const hf = parseFloat(healthFactor);
  let bgColor = "bg-green-100 text-green-800";
  let status = "Healthy";

  if (hf < 1.1) {
    bgColor = "bg-red-100 text-red-800";
    status = "At Risk";
  } else if (hf < 1.5) {
    bgColor = "bg-yellow-100 text-yellow-800";
    status = "Moderate";
  }

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm ${bgColor}`}>
      {status} ({parseFloat(healthFactor).toFixed(2)})
    </span>
  );
}

function UserPositionsContent() {
  // Fetch user supplies with suspense
  const { data: supplies } = useUserSupplies({
    markets,
    user: EXAMPLE_USER,
    suspense: true,
  });

  // Fetch user borrows with suspense
  const { data: borrows } = useUserBorrows({
    markets,
    user: EXAMPLE_USER,
    suspense: true,
  });

  // Fetch account health with suspense
  const { data: marketState } = useUserMarketState({
    market: ETHEREUM_MAINNET_MARKET,
    user: EXAMPLE_USER,
    chainId: CHAIN_ID,
    suspense: true,
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header with account health */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">User Positions</h1>
          <div className="text-sm text-gray-500">
            User:{" "}
            <code className="bg-gray-100 px-2 py-1 rounded">
              {EXAMPLE_USER.slice(0, 6)}...{EXAMPLE_USER.slice(-4)}
            </code>
          </div>
        </div>

        {marketState && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                Health Factor
              </h3>
              <HealthFactorBadge healthFactor={marketState.healthFactor} />
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                Net Worth
              </h3>
              <p className="text-lg font-semibold text-gray-900">
                $
                {marketState.netWorth
                  ? parseFloat(marketState.netWorth).toLocaleString()
                  : "0.00"}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-600 mb-1">E-Mode</h3>
              <span
                className={`inline-block px-2 py-1 rounded text-sm ${
                  marketState.eModeEnabled
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {marketState.eModeEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Supplies Section */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Supplied Assets
          </h2>
        </div>

        <div className="p-6">
          {supplies && supplies.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-sm font-medium text-gray-600">
                      Asset
                    </th>
                    <th className="text-right py-2 text-sm font-medium text-gray-600">
                      Amount
                    </th>
                    <th className="text-right py-2 text-sm font-medium text-gray-600">
                      Value (USD)
                    </th>
                    <th className="text-right py-2 text-sm font-medium text-gray-600">
                      APY
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {supplies.map((supply, index) => (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="py-3">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {supply.currency?.symbol || "Unknown"}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right text-sm text-gray-900">
                        {parseFloat(
                          supply.balance?.amount?.value || "0",
                        ).toFixed(6)}
                      </td>
                      <td className="py-3 text-right text-sm text-gray-900">
                        $
                        {parseFloat(
                          supply.balance?.usd || "0",
                        ).toLocaleString()}
                      </td>
                      <td className="py-3 text-right text-sm text-green-600">
                        {parseFloat(supply.apy?.formatted || "0").toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No supplied assets found</p>
            </div>
          )}
        </div>
      </div>

      {/* Borrows Section */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Borrowed Assets
          </h2>
        </div>

        <div className="p-6">
          {borrows && borrows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-sm font-medium text-gray-600">
                      Asset
                    </th>
                    <th className="text-right py-2 text-sm font-medium text-gray-600">
                      Amount
                    </th>
                    <th className="text-right py-2 text-sm font-medium text-gray-600">
                      Value (USD)
                    </th>
                    <th className="text-right py-2 text-sm font-medium text-gray-600">
                      APY
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {borrows.map((borrow, index) => (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="py-3">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {borrow.currency?.symbol || "Unknown"}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right text-sm text-gray-900">
                        {parseFloat(borrow.debt?.amount?.value || "0").toFixed(
                          6,
                        )}
                      </td>
                      <td className="py-3 text-right text-sm text-gray-900">
                        ${parseFloat(borrow.debt?.usd || "0").toLocaleString()}
                      </td>
                      <td className="py-3 text-right text-sm text-red-600">
                        {borrow.apy?.formatted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No borrowed assets found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Tables skeleton */}
        {[1, 2].map((section) => (
          <div key={section} className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="h-6 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {[1, 2, 3].map((row) => (
                  <div key={row} className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-12"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UserPositions() {
  const errorFallback = (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h2 className="text-xl font-semibold text-red-800 mb-2">
          Error Loading Positions
        </h2>
        <p className="text-red-600">
          Failed to load user positions. Please check your connection and try
          again.
        </p>
      </div>
    </div>
  );

  return (
    <PositionsErrorBoundary fallback={errorFallback}>
      <Suspense fallback={<LoadingFallback />}>
        <UserPositionsContent />
      </Suspense>
    </PositionsErrorBoundary>
  );
}
