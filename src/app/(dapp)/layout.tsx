import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import TokenInitializer from "@/components/meta/TokensInitializer";
import { CombinedWalletProvider } from "@/components/meta/WalletContext";

export default async function DAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CombinedWalletProvider>
      <div className="flex flex-col h-dvh">
        <TokenInitializer />
        <SiteHeader />
        <main className="container mx-auto flex-1 pt-6 px-2 sm:px-4 pb-6">
          {children}
        </main>
        <SiteFooter />
      </div>
    </CombinedWalletProvider>
  );
}
