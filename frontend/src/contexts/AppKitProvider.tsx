import { wagmiAdapter, projectId, monadTestnet } from "@/config/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { type ReactNode } from "react";
import { WagmiProvider } from "wagmi";

const queryClient = new QueryClient();

const metadata = {
  name: "MonoMons",
  description: "Pokemon-like game on Monad blockchain",
  url: typeof window !== "undefined" ? window.location.origin : "",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// Create and initialize the AppKit modal
if (projectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [monadTestnet as any],
    defaultNetwork: monadTestnet as any,
    metadata: metadata,
    features: {
      analytics: true,
    },
  });
}

export function AppKitProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
