import type { PrivyClientConfig } from '@privy-io/react-auth';

export const celoAlfajoresTestnet = {
  id: 11142220,
  name: 'Celo Alfajores Testnet',
  network: 'celo-alfajores',
  nativeCurrency: {
    name: 'CELO',
    symbol: 'CELO',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://alfajores-forno.celo-testnet.org'],
    },
    public: {
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
};

export const privyConfig: PrivyClientConfig = {
  embeddedWallets: {
    createOnLogin: 'all-users',
  },
  loginMethods: ['email', 'wallet'],
  defaultChain: celoAlfajoresTestnet,
  supportedChains: [celoAlfajoresTestnet],
  appearance: {
    theme: 'dark',
    accentColor: '#F59E0B', // Yellow-400 to match app theme
    logo: undefined,
    walletList: ['metamask', 'coinbase_wallet'],
  },
};
