"use client";

import React from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import BrandedButton from "@/components/ui/BrandedButton";
import Image from "next/image";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { UserBorrowPosition } from "@/types/aave";

interface UserBorrowCardProps {
  position: UserBorrowPosition;
  onBorrow?: (position: UserBorrowPosition) => void;
  onRepay?: (position: UserBorrowPosition) => void;
}

const UserBorrowCard: React.FC<UserBorrowCardProps> = ({
  position,
  onBorrow,
  onRepay,
}) => {
  const { borrow, marketName } = position;
  const balanceUsd = parseFloat(borrow.debt.usd) || 0;
  const apy = parseFloat(borrow.apy.value) || 0;

  return (
    <Card className="text-white border border-[#27272A] bg-[#18181B] rounded-lg shadow-none hover:bg-[#1C1C1F] transition-colors">
      <CardHeader className="flex flex-row items-start p-4 pb-2 space-y-0">
        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center mr-3 flex-shrink-0">
          <Image
            src={borrow.currency.imageUrl}
            alt={borrow.currency.symbol}
            width={32}
            height={32}
            className="object-contain"
            onError={(e) => {
              e.currentTarget.src = "/images/tokens/default.svg";
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold text-[#FAFAFA] leading-none">
              {borrow.currency.symbol}
            </CardTitle>
          </div>
          <CardDescription className="text-[#A1A1AA] text-xs mt-1 flex items-center gap-1">
            <Image
              src={borrow.market.icon}
              alt={marketName}
              width={16}
              height={16}
              className="object-contain rounded-full"
              onError={(e) => {
                e.currentTarget.src = "/images/markets/default.svg";
              }}
            />
            {marketName}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-3">
        {/* Borrowed Balance */}
        <div className="flex justify-between items-center">
          <div className="text-[#A1A1AA] text-sm">borrowed</div>
          <div className="text-right">
            <div className="text-[#FAFAFA] text-sm font-semibold font-mono">
              {formatCurrency(balanceUsd)}
            </div>
          </div>
        </div>

        {/* Borrow APY */}
        <div className="flex justify-between items-center">
          <div className="text-[#A1A1AA] text-sm">APY</div>
          <div className="text-red-500 text-sm font-semibold font-mono">
            {formatPercentage(apy * 100)}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 p-4 pt-0">
        <BrandedButton
          buttonText="details"
          onClick={() => {
            //placeholder, we would be passing in these functions as props to the modal
            console.log(onBorrow, onRepay);
          }}
          className="flex-1 text-xs py-2 h-8"
          disabled={true}
        />
      </CardFooter>
    </Card>
  );
};

export default UserBorrowCard;
