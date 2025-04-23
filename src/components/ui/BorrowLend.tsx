"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/Accordion";
import PoweredByAave from "@/components/ui/PoweredByAave";
import SupplyOwnedCard from "@/components/ui/SupplyOwnedCard";
import SupplyUnOwnedCard from "@/components/ui/SupplyUnownedCard";

const BorrowLend: React.FC = () => {
  return (
    <div className="flex h-full w-full items-start justify-center sm:pt-[6vh] pt-[2vh] min-h-[500px]">
      <div className="w-full">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>your positions</AccordionTrigger>
            <AccordionContent>
              <SupplyOwnedCard />
              <SupplyUnOwnedCard />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <PoweredByAave />
      </div>
    </div>
  );
};

export default BorrowLend;
