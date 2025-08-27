import { Reserve } from "@/types/aave";

export const getDeduplicatedIncentives = (
  incentives: Reserve["incentives"],
) => {
  if (!incentives || incentives.length === 0) return [];

  const seen = new Set<string>();
  const uniqueIncentives: {
    key: string;
    text: string;
    aprValue: number;
    type: string;
  }[] = [];

  incentives.forEach((incentive, index) => {
    let text = "";
    let aprValue = 0;
    let dedupeKey = "";

    switch (incentive.__typename) {
      case "MeritSupplyIncentive":
        text = "merit supply";
        aprValue = incentive.extraSupplyApr.value;
        dedupeKey = "merit-supply";
        break;
      case "MeritBorrowIncentive":
        text = "merit borrow";
        aprValue = incentive.borrowAprDiscount.value;
        dedupeKey = "merit-borrow";
        break;
      case "MeritBorrowAndSupplyIncentiveCondition":
        text = `merit ${incentive.supplyToken.symbol}/${incentive.borrowToken.symbol}`;
        aprValue = incentive.extraApr.value;
        dedupeKey = `merit-condition-${incentive.supplyToken.symbol}-${incentive.borrowToken.symbol}`;
        break;
      case "AaveSupplyIncentive":
        text = `${incentive.rewardTokenSymbol} supply`;
        aprValue = incentive.extraSupplyApr.value;
        dedupeKey = `aave-supply-${incentive.rewardTokenSymbol}`;
        break;
      case "AaveBorrowIncentive":
        text = `${incentive.rewardTokenSymbol} borrow`;
        aprValue = incentive.borrowAprDiscount.value;
        dedupeKey = `aave-borrow-${incentive.rewardTokenSymbol}`;
        break;
    }

    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      uniqueIncentives.push({
        key: `${incentive.__typename}-${index}`,
        text,
        aprValue,
        type: incentive.__typename.includes("Supply") ? "supply" : "borrow",
      });
    }
  });

  return uniqueIncentives;
};

export const calculateApyWithIncentives = (
  baseSupplyAPY: number,
  baseBorrowAPY: number,
  incentives: Reserve["incentives"],
) => {
  const deduplicatedIncentives = getDeduplicatedIncentives(incentives);

  const supplyBonuses = deduplicatedIncentives.filter(
    (incentive) => incentive.type === "supply",
  );
  const borrowBonuses = deduplicatedIncentives.filter(
    (incentive) => incentive.type === "borrow",
  );

  const supplyBonusTotal = supplyBonuses.reduce(
    (sum, incentive) => sum + Number(incentive.aprValue),
    0,
  );
  const borrowBonusTotal = borrowBonuses.reduce(
    (sum, incentive) => sum + Number(incentive.aprValue),
    0,
  );

  // console.log("Base Supply APY:", baseSupplyAPY);
  // console.log("Base Borrow APY:", baseBorrowAPY);
  // console.log("Supply Bonuses:", supplyBonuses);
  // console.log("Borrow Bonuses:", borrowBonuses);
  // console.log("Final Supply APY:", Number(baseSupplyAPY) + Number(supplyBonusTotal));
  // console.log("Final Borrow APY:", Number(baseBorrowAPY) - Number(borrowBonusTotal));
  // console.log("Has Supply Bonuses:", supplyBonuses.length > 0);
  // console.log("Has Borrow Bonuses:", borrowBonuses.length > 0);
  // console.log("-------------------------------------")

  return {
    finalSupplyAPY: (Number(baseSupplyAPY) + Number(supplyBonusTotal)) * 100,
    finalBorrowAPY: (Number(baseBorrowAPY) - Number(borrowBonusTotal)) * 100,
    hasSupplyBonuses: supplyBonuses.length > 0,
    hasBorrowBonuses: borrowBonuses.length > 0,
  };
};
