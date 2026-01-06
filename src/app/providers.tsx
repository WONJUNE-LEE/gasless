"use client";

import * as React from "react";
import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
  Chain,
} from "@rainbow-me/rainbowkit";
import {
  arbitrum,
  mainnet,
  optimism,
  polygon,
  base,
  bsc,
  avalanche,
  monad,
} from "wagmi/chains";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

// 1. 사용할 체인 설정 (필요한 체인만 추가)
const chains: readonly [Chain, ...Chain[]] = [
  mainnet,
  arbitrum,
  bsc,
  polygon,
  base,
  optimism,
  avalanche,
  monad,
];

// 2. Wagmi Config 생성
const config = getDefaultConfig({
  appName: "My DEX",
  projectId: "YOUR_PROJECT_ID", // WalletConnect Cloud에서 무료 발급 필요
  chains: chains,
  ssr: true, // Next.js SSR 지원
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
          modalSize="compact" // 팝업 크기 조절
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
