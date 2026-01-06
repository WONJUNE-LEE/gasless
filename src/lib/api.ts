// src/lib/api.ts
import { formatUnits, parseUnits } from "ethers";

export const CHAINS = [
  {
    id: 1,
    name: "Ethereum",
    symbol: "ETH",
    logo: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
    slug: "eth",
  },
  {
    id: 42161,
    name: "Arbitrum One",
    symbol: "ETH",
    logo: "https://assets.coingecko.com/coins/images/16547/small/arbitrum.png",
    slug: "arbitrum",
  },
  {
    id: 56,
    name: "BNB Smart Chain",
    symbol: "BNB",
    logo: "https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png",
    slug: "bsc",
  },
  {
    id: 137,
    name: "Polygon",
    symbol: "POL",
    logo: "https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png",
    slug: "polygon_pos",
  },
  {
    id: 10,
    name: "OP Mainnet",
    symbol: "ETH",
    logo: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
    slug: "optimism",
  },
  {
    id: 8453,
    name: "Base",
    symbol: "ETH",
    logo: "https://assets.coingecko.com/coins/images/31199/small/base.png",
    slug: "base",
  },
  {
    id: 43114,
    name: "Avalanche C",
    symbol: "AVAX",
    logo: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
    slug: "avalanche",
  },
  {
    id: 143,
    name: "Monad",
    symbol: "MON",
    logo: "https://assets.coingecko.com/coins/images/33059/small/monad.png",
    slug: "monad",
  },
];

export const NATIVE_TOKEN_ADDRESS =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

export interface TokenInfo {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  price?: string;
  change24h?: string;
  volume24h?: string;
  liquidity?: string;
  marketCap?: string;
}

// [핵심] 모든 API 호출을 여기서 관리
export const okxApi = {
  // 1. 토큰 리스트 (가격 정보 포함)
  getTokens: async (
    chainId: number,
    query: string = ""
  ): Promise<TokenInfo[]> => {
    try {
      const url = `/api/tokens?chainId=${chainId}${query ? `&q=${query}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error("getTokens error:", e);
      return [];
    }
  },

  // 2. 차트 데이터
  getCandles: async (
    chainId: number,
    tokenAddress: string,
    timeframe: string
  ) => {
    try {
      const url = `/api/chart?chainId=${chainId}&tokenAddress=${tokenAddress}&timeframe=${timeframe}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error("getCandles error:", e);
      return [];
    }
  },

  // 3. 스왑 견적
  getQuote: async (params: {
    chainId: number;
    tokenIn: string;
    tokenOut: string;
    amount: string;
  }) => {
    try {
      const url = `/api/quote?chainId=${params.chainId}&tokenIn=${params.tokenIn}&tokenOut=${params.tokenOut}&amount=${params.amount}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (e) {
      console.error("getQuote error:", e);
      return null;
    }
  },
};
