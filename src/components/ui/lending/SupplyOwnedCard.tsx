import React, { useState } from "react";
import { DollarSign } from "lucide-react";
import { BlueButton, PrimaryButton } from "./SupplyButtonComponents";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import SupplyCollateralSwitch from "@/components/ui/lending/SupplyCollateralSwitch";

const SupplyOwnedCard = ({
  title = "usd coin",
  subtitle = "USDC",
  balance = "0.4103290",
  dollarAmount = "0.41",
  supplyAPY = "2.74",
  isCollateral = true,
  onSwitch = () => {},
  onWithdraw = () => {},
}) => {
  const [collateral, setCollateral] = useState(isCollateral);

  const handleToggle = () => {
    setCollateral(!collateral);
    onSwitch();
  };

  return (
    <Card className=" text-white border border-[#232326] w-[271px] h-[198px] p-0 rounded-[3px] shadow-none">
      <CardHeader className="flex flex-row items-start p-3 pt-3 pb-1 space-y-0">
        <div className="bg-blue-500 rounded-full p-2 mr-3 flex-shrink-0">
          <DollarSign size={18} color="white" />
        </div>
        <div>
          <CardTitle className="text-sm font-medium leading-none">
            {title}
          </CardTitle>
          <CardDescription className="text-gray-400 text-xs mt-1">
            {subtitle}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-2 space-y-2">
        {/* Balance row */}
        <div className="flex justify-between items-start">
          <div className="text-gray-400 text-sm mt-0">supply balance</div>
          <div className="text-right flex flex-col items-end">
            <div className="text-sm">{balance}</div>
            <div className="text-gray-400 text-xs">${dollarAmount}</div>
          </div>
        </div>

        {/* APY row */}
        <div className="flex justify-between items-start">
          <div className="text-gray-400 text-sm mt-0">supply APY</div>
          <div className="text-sm">{supplyAPY}%</div>
        </div>

        {/* Collateral toggle row */}
        <div className="flex justify-between items-start">
          <div className="text-gray-400 text-sm mt-0">used as collateral</div>
          <SupplyCollateralSwitch
            isCollateral={collateral}
            onToggle={handleToggle}
          />
        </div>
      </CardContent>

      <CardFooter className="flex justify-between p-3 pt-0 gap-2">
        <PrimaryButton onClick={onSwitch}>switch</PrimaryButton>
        <BlueButton onClick={onWithdraw}>withdraw</BlueButton>
      </CardFooter>
    </Card>
  );
};

export default SupplyOwnedCard;
