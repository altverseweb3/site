"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/Accordion";
import PoweredByAave from "@/components/ui/lending/PoweredByAave";
import SupplyOwnedCard from "@/components/ui/lending/SupplyOwnedCard";
import SupplyUnownedCard from "@/components/ui/lending/SupplyUnownedCard";
import SupplyYourPositionsHeader from "@/components/ui/lending/SupplyAvailablePositionsHeader";

const BorrowLend: React.FC = () => {
  return (
    <div className="flex h-full w-full items-start justify-center sm:pt-[6vh] pt-[2vh] min-h-[500px]">
      <div className="w-full">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="positions" className="border-0">
            <AccordionTrigger className="p-0 hover:no-underline data-[state=open]:bg-transparent">
              <SupplyYourPositionsHeader />
            </AccordionTrigger>
            <AccordionContent>
              <SupplyOwnedCard asset={undefined} />
              <SupplyUnownedCard />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <PoweredByAave />
      </div>
    </div>
  );
};

export default BorrowLend;
