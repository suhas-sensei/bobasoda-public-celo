'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { privyConfig, celoAlfajoresTestnet } from '@/lib/privy-config';
import { http } from 'wagmi';
import { createConfig } from '@privy-io/wagmi';
import { ReactNode } from 'react';
import { defineChain } from 'viem';

const queryClient = new QueryClient();

// Define Celo Alfajores as a proper viem chain
export const celoAlfajores = defineChain({
  id: 11142220,
  name: 'Celo Alfajores Testnet',
  nativeCurrency: {
    name: 'CELO',
    symbol: 'CELO',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://alfajores-forno.celo-testnet.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Celo Explorer',
      url: 'https://alfajores.celoscan.io',
    },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [celoAlfajores],
  transports: {
    [celoAlfajores.id]: http('https://alfajores-forno.celo-testnet.org'),
  },
});

export default function Providers({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

  // If no app ID is set, show error message
  if (!appId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#27262c' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-yellow-400 mb-4">Configuration Required</h1>
          <p className="text-yellow-400 opacity-75 mb-2">Please set your Privy App ID in the .env.local file</p>
          <p className="text-yellow-400 opacity-75 text-sm">Get your App ID from https://dashboard.privy.io/</p>
        </div>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={privyConfig}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
