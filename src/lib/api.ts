// src/lib/api.ts
import { formatUnits, parseUnits } from "ethers";

export interface ChainConfig {
  id: number;
  name: string;
  symbol: string;
  logo: string;
  slug: string;
  wrappedTokenAddress: string;
}

export const CHAINS: ChainConfig[] = [
  {
    id: 1,
    name: "Ethereum",
    symbol: "ETH",
    logo: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
    slug: "eth",
    wrappedTokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  },
  {
    id: 42161,
    name: "Arbitrum One",
    symbol: "ETH",
    logo: "https://assets.coingecko.com/coins/images/16547/small/arbitrum.png",
    slug: "arbitrum",
    wrappedTokenAddress: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
  },
  {
    id: 56,
    name: "BNB Smart Chain",
    symbol: "BNB",
    logo: "https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png",
    slug: "bsc",
    wrappedTokenAddress: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
  },
  {
    id: 137,
    name: "Polygon",
    symbol: "POL",
    logo: "https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png",
    slug: "polygon_pos",
    wrappedTokenAddress: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
  },
  {
    id: 10,
    name: "OP Mainnet",
    symbol: "ETH",
    logo: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
    slug: "optimism",
    wrappedTokenAddress: "0x4200000000000000000000000000000000000006",
  },
  {
    id: 8453,
    name: "Base",
    symbol: "ETH",
    // [수정] Base 로고 URL 업데이트 (TrustWallet Assets)
    logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png",
    slug: "base",
    wrappedTokenAddress: "0x4200000000000000000000000000000000000006",
  },
  {
    id: 43114,
    name: "Avalanche C",
    symbol: "AVAX",
    logo: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
    slug: "avalanche",
    wrappedTokenAddress: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
  },
  {
    id: 143,
    name: "Monad",
    symbol: "MON",
    // [수정] Monad 로고 (공식 소셜 이미지 혹은 로컬 파일 사용 권장. 여기선 작동 가능한 URL로 대체)
    logo: "https://raw.githubusercontent.com/monad-foundation/media-kit/main/Logos/Monad_Logo_Circle.png",
    slug: "monad",
    wrappedTokenAddress: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A",
  },
];

export const NATIVE_TOKEN_ADDRESS =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

// ... (TokenInfo 인터페이스 및 okxApi 객체는 기존과 동일하게 유지)
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
  isNative?: boolean;
}

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
    slippage: string;
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
