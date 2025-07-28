"use client";

import Image from "next/image";

const EarnCard = () => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <div className="absolute w-full h-full">
        <div className="relative w-full h-full">
          <Image
            src="/images/earn.png"
            alt="Earn visualization"
            width={1100}
            height={950}
            className="absolute object-contain brightness-110"
            style={{
              right: "0%",
              top: "0%",
              width: "80%",
              height: "80%",
              opacity: 1,
            }}
            priority
          />
        </div>
      </div>

      {/* Subtle gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/70 to-transparent pointer-events-none" />
    </div>
  );
};

export default EarnCard;
