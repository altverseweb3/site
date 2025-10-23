import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import TokenInitializer from "@/components/meta/TokensInitializer";
import { AaveClientProvider } from "@/components/meta/AaveClientProvider";
import DynamicWalletContext from "@/components/meta/DynamicWalletContext";
export default async function DAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DynamicWalletContext>
      <div className="flex flex-col h-dvh">
        <AaveClientProvider>
          <TokenInitializer />
          <SiteHeader />
          <main className="container mx-auto flex-1 pt-6 px-2 sm:px-4 pb-6">
            {children}
          </main>
        </AaveClientProvider>
        <SiteFooter />
      </div>
    </DynamicWalletContext>
  );
}
