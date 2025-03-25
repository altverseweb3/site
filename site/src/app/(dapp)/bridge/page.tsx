"use client";

import React, { useState } from "react";
import { Settings } from "lucide-react";
import { AssetBox } from "@/components/ui/AssetBox";
import { TokenInputGroup } from "@/components/ui/TokenInputGroup";
import { SwapInterface } from "@/components/ui/SwapInterface";
import { TokenSwitch } from "@/components/ui/TokenSwitch";

const BridgeComponent: React.FC = () => {
  const [amount, setAmount] = useState<string>("");

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setAmount(e.target.value);
  };

  const settingsButton = (
    <button>
      <Settings className="h-5 w-5 text-zinc-400 hover:text-zinc-50 transition-colors" />
    </button>
  );

  return (
    <div className="flex h-full w-full items-start justify-center sm:pt-[6vh] pt-[2vh] min-h-[500px]">
      <div className="w-full max-w-md">
        <SwapInterface
          actionButton={{
            text: "bridge",
            iconName: "Cable",
            disabled: !amount || amount === "0",
          }}
        >
          {/* Send Box */}
          <AssetBox
            title="send"
            showSettings={true}
            settingsComponent={settingsButton}
            showChainSelector={true}
            boxType="source"
          >
            <TokenInputGroup
              variant="amber"
              amount={amount}
              onChange={handleAmountChange}
              showSelectToken={true}
            />
          </AssetBox>

          <TokenSwitch />

          {/* Receive Box */}
          <AssetBox
            title="receive"
            showSettings={false}
            showChainSelector={true}
            boxType="destination"
          >
            <TokenInputGroup
              variant="sky"
              amount=""
              readOnly={true}
              showSelectToken={false}
            />
          </AssetBox>
        </SwapInterface>
      </div>
    </div>
  );
};

export default BridgeComponent;
