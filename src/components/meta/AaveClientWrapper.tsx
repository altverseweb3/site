"use client";

import { AaveProvider } from "@aave/react";
import { client } from "@/config/client";

interface AaveClientProviderProps {
  children: React.ReactNode;
}

export function AaveClientProvider({ children }: AaveClientProviderProps) {
  return <AaveProvider client={client}>{children}</AaveProvider>;
}
