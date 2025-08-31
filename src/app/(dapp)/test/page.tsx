"use client";

import React, { useState, Suspense } from "react";
import {
  useAaveMarketsData,
  useAaveSingleMarketData,
  useAaveBorrowAPYHistory,
  useAaveSupplyAPYHistory,
} from "@/hooks/aave/useAaveMarketsData";
import {
  useAaveUserSupplies,
  useAaveUserBorrows,
  useAaveUserMarketState,
  useAaveUserTransactionHistory,
} from "@/hooks/aave/useAaveUserData";
import { chainId, evmAddress } from "@aave/react";

function ConsoleOutput({ data }: { data: unknown }) {
  return (
    <pre className="w-full text-left text-xs bg-gray-900 p-4 rounded-md overflow-x-auto whitespace-pre-wrap break-words">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function MarketsDataRenderer() {
  const { markets } = useAaveMarketsData({
    user: evmAddress("0xf5d8777EA028Ad29515aA81E38e9B85afb7d6303"),
    chainIds: [chainId(137)],
  });
  return <ConsoleOutput data={markets} />;
}
function SingleMarketDataRenderer() {
  const { market } = useAaveSingleMarketData({
    user: evmAddress("0xf5d8777EA028Ad29515aA81E38e9B85afb7d6303"),
    chainId: chainId(137),
    address: evmAddress("0x794a61358D6845594F94dc1DB02A252b5b4814aD"),
  });
  return <ConsoleOutput data={market} />;
}

function BorrowAPYHistoryRenderer() {
  const { history } = useAaveBorrowAPYHistory({
    chainId: chainId(42161),
    underlyingToken: evmAddress("0xaf88d065e77c8cC2239327C5EDb3A432268e5831"),
    market: evmAddress("0x794a61358D6845594F94dc1DB02A252b5b4814aD"),
    window: "LAST_DAY",
  });
  return <ConsoleOutput data={history} />;
}

function SupplyAPYHistoryRenderer() {
  const { history } = useAaveSupplyAPYHistory({
    chainId: chainId(42161),
    underlyingToken: evmAddress("0xaf88d065e77c8cC2239327C5EDb3A432268e5831"),
    market: evmAddress("0x794a61358D6845594F94dc1DB02A252b5b4814aD"),
    window: "LAST_DAY",
  });
  return <ConsoleOutput data={history} />;
}

const TEST_USER_ADDRESS = evmAddress(
  "0xc6165A271f5cB5960c4554a8b44fCf3C75fa7F6C",
);

function UserSuppliesRenderer() {
  const { data } = useAaveUserSupplies({
    user: TEST_USER_ADDRESS,
    markets: [
      {
        chainId: chainId(1),
        address: evmAddress("0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2"),
      },
      {
        chainId: chainId(42161),
        address: evmAddress("0x794a61358D6845594F94dc1DB02A252b5b4814aD"),
      },
    ],
  });
  return <ConsoleOutput data={data} />;
}

function UserBorrowsRenderer() {
  const { data } = useAaveUserBorrows({
    user: evmAddress("0xf5d8777EA028Ad29515aA81E38e9B85afb7d6303"),
    markets: [
      {
        chainId: chainId(137),
        address: evmAddress("0x794a61358D6845594F94dc1DB02A252b5b4814aD"),
      },
    ],
  });
  return <ConsoleOutput data={data} />;
}

function UserMarketStateRenderer() {
  const { data } = useAaveUserMarketState({
    user: TEST_USER_ADDRESS,
    chainId: chainId(42161),
    market: evmAddress("0x794a61358D6845594F94dc1DB02A252b5b4814aD"),
  });
  return <ConsoleOutput data={data} />;
}

function UserTransactionHistoryRenderer() {
  const { data } = useAaveUserTransactionHistory({
    user: TEST_USER_ADDRESS,
    chainId: chainId(137),
    market: {
      chainId: chainId(137),
      address: evmAddress("0x794a61358D6845594F94dc1DB02A252b5b4814aD"),
    },
  });
  return <ConsoleOutput data={data} />;
}

export default function AaveTestPage() {
  const [activeRenderer, setActiveRenderer] = useState<
    | "markets"
    | "singleMarket"
    | "borrowHistory"
    | "supplyHistory"
    | "userSupplies"
    | "userBorrows"
    | "userMarketState"
    | "userTxHistory"
    | null
  >(null);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-mono text-3xl font-bold mb-2 text-amber-500">
          aave hooks testbed
        </h1>
        <p className="text-gray-400 mb-8">
          click a button to render a component that uses a suspenseful hook. the
          raw data will be displayed below.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveRenderer("markets")}
            className="font-mono text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={activeRenderer === "markets"}
          >
            render markets data
          </button>
          <button
            onClick={() => setActiveRenderer("singleMarket")}
            className="font-mono text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={activeRenderer === "singleMarket"}
          >
            render single market
          </button>
          <button
            onClick={() => setActiveRenderer("borrowHistory")}
            className="font-mono text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={activeRenderer === "borrowHistory"}
          >
            render borrow APY history
          </button>
          <button
            onClick={() => setActiveRenderer("supplyHistory")}
            className="font-mono text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={activeRenderer === "supplyHistory"}
          >
            render supply APY history
          </button>

          <button
            onClick={() => setActiveRenderer("userSupplies")}
            className="font-mono text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={activeRenderer === "userSupplies"}
          >
            render user supplies
          </button>
          <button
            onClick={() => setActiveRenderer("userBorrows")}
            className="font-mono text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={activeRenderer === "userBorrows"}
          >
            render user borrows
          </button>
          <button
            onClick={() => setActiveRenderer("userMarketState")}
            className="font-mono text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={activeRenderer === "userMarketState"}
          >
            render user market state
          </button>
          <button
            onClick={() => setActiveRenderer("userTxHistory")}
            className="font-mono text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={activeRenderer === "userTxHistory"}
          >
            render user tx history
          </button>
        </div>

        <div className="mt-8 p-4 bg-gray-800 rounded-lg min-h-[200px] flex items-center justify-center">
          <Suspense
            fallback={
              <div className="text-gray-400 animate-pulse">Loading data...</div>
            }
          >
            {activeRenderer === "markets" && <MarketsDataRenderer />}
            {activeRenderer === "singleMarket" && <SingleMarketDataRenderer />}
            {activeRenderer === "borrowHistory" && <BorrowAPYHistoryRenderer />}
            {activeRenderer === "supplyHistory" && <SupplyAPYHistoryRenderer />}
            {activeRenderer === "userSupplies" && <UserSuppliesRenderer />}
            {activeRenderer === "userBorrows" && <UserBorrowsRenderer />}
            {activeRenderer === "userMarketState" && (
              <UserMarketStateRenderer />
            )}
            {activeRenderer === "userTxHistory" && (
              <UserTransactionHistoryRenderer />
            )}
            {activeRenderer === null && (
              <div className="text-gray-500">
                Select a data source to render.
              </div>
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
