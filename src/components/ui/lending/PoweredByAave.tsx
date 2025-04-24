import React from "react";
import Image from "next/image";

const PoweredByAave = () => {
  return (
    <div className="flex justify-end mt-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-white">powered by</span>
        <Image
          src="/protocols/aave.svg"
          alt="Aave Logo"
          height={12}
          width={40}
          className="h-3 w-auto"
        />
      </div>
    </div>
  );
};

export default PoweredByAave;
