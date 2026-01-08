"use client";

import * as React from "react";
import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import {
  rainbowWallet,
  metaMaskWallet,
  baseAccount,
  walletConnectWallet,
  okxWallet,
} from "@rainbow-me/rainbowkit/wallets";
import {
  mainnet,
  arbitrum,
  base,
  optimism,
  polygon,
  bsc,
  avalanche,
  monad,
} from "wagmi/chains";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

// 1. 사용할 체인 정의
const chains = [
  mainnet,
  arbitrum,
  bsc,
  polygon,
  base,
  optimism,
  avalanche,
  monad,
] as const;

// 2. Wagmi Config (지갑 충돌 방지 설정)
const config = getDefaultConfig({
  appName: "Berachain DEX",
  projectId: "YOUR_PROJECT_ID", // https://cloud.walletconnect.com 에서 무료 발급 필요
  chains: chains,
  ssr: true,
  // [핵심] 여기에 적은 지갑은 '추천 목록'에 뜹니다.
  // Phantom, Rabby 등은 브라우저에 설치되어 있으면 자동으로 'Installed' 섹션에 뜨므로 굳이 안 적어도 됩니다.
  wallets: [
    {
      groupName: "Recommended",
      wallets: [
        rainbowWallet,
        metaMaskWallet,
        baseAccount,
        okxWallet,
        walletConnectWallet, // 이게 있으면 모바일의 거의 모든 지갑이 연결됩니다.
      ],
    },
  ],
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#2563eb", // blue-600
            accentColorForeground: "white",
            borderRadius: "large",
            overlayBlur: "small",
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
