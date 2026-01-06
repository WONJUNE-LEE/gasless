// src/lib/api.ts

export const CHAINS = [
  {
    id: 42161,
    name: "Arbitrum One",
    symbol: "ARB",
    logo: "https://assets.coingecko.com/coins/images/16547/small/arbitrum.png",
    slug: "arbitrum",
  },
  {
    id: 1,
    name: "Ethereum",
    symbol: "ETH",
    logo: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
    slug: "ethereum",
  },
  {
    id: 10,
    name: "OP Mainnet",
    symbol: "OP",
    logo: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
    slug: "optimism",
  },
  {
    id: 137,
    name: "Polygon",
    symbol: "POL",
    logo: "https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png",
    slug: "polygon_pos",
  },
  {
    id: 8453,
    name: "Base",
    symbol: "BASE",
    logo: "https://assets.coingecko.com/coins/images/31199/small/base.png",
    slug: "base",
  },
];

export interface TokenInfo {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
}

// 체인별 기본 토큰 설정 (체인 변경 시 초기화용)
export const DEFAULT_TOKENS: Record<number, { A: TokenInfo; B: TokenInfo }> = {
  42161: {
    // Arbitrum
    A: {
      chainId: 42161,
      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      name: "Wrapped Ether",
      symbol: "WETH",
      decimals: 18,
      logoURI: "https://assets.coingecko.com/coins/images/2518/thumb/weth.png",
    },
    B: {
      chainId: 42161,
      address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
      logoURI: "https://assets.coingecko.com/coins/images/325/thumb/Tether.png",
    },
  },
  1: {
    // Ethereum
    A: {
      chainId: 1,
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      name: "Wrapped Ether",
      symbol: "WETH",
      decimals: 18,
      logoURI: "https://assets.coingecko.com/coins/images/2518/thumb/weth.png",
    },
    B: {
      chainId: 1,
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
      logoURI: "https://assets.coingecko.com/coins/images/325/thumb/Tether.png",
    },
  },
  10: {
    // Optimism
    A: {
      chainId: 10,
      address: "0x4200000000000000000000000000000000000006",
      name: "Wrapped Ether",
      symbol: "WETH",
      decimals: 18,
      logoURI: "https://assets.coingecko.com/coins/images/2518/thumb/weth.png",
    },
    B: {
      chainId: 10,
      address: "0x94b008aA00579c1307B0EF2c499aD98a8ce98e48",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
      logoURI: "https://assets.coingecko.com/coins/images/325/thumb/Tether.png",
    },
  },
  137: {
    // Polygon
    A: {
      chainId: 137,
      address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      name: "WMATIC",
      symbol: "WMATIC",
      decimals: 18,
      logoURI:
        "https://assets.coingecko.com/coins/images/4713/thumb/matic-token-icon.png",
    },
    B: {
      chainId: 137,
      address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      name: "Tether USD",
      symbol: "USDT",
      decimals: 6,
      logoURI: "https://assets.coingecko.com/coins/images/325/thumb/Tether.png",
    },
  },
  8453: {
    // Base
    A: {
      chainId: 8453,
      address: "0x4200000000000000000000000000000000000006",
      name: "Wrapped Ether",
      symbol: "WETH",
      decimals: 18,
      logoURI: "https://assets.coingecko.com/coins/images/2518/thumb/weth.png",
    },
    B: {
      chainId: 8453,
      address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
      name: "Dai Stablecoin",
      symbol: "DAI",
      decimals: 18,
      logoURI: "https://assets.coingecko.com/coins/images/9956/thumb/4943.png",
    },
  },
};

// 1. 토큰 리스트 (Fail-safe 적용)
export const fetchTokenList = async (chainId: number): Promise<TokenInfo[]> => {
  try {
    // 1차 시도: OKX Proxy (서버 API)
    // .env 설정이 없거나 오류 발생 시 catch로 이동
    const res = await fetch(`/api/tokens?chainId=${chainId}`);
    if (!res.ok) throw new Error("OKX API Failed");
    return await res.json();
  } catch (e) {
    console.warn("Falling back to 1inch API due to:", e);
    // 2차 시도: 1inch Public API (백업)
    try {
      const res = await fetch(`https://tokens.1inch.io/v1.1/${chainId}`);
      const data = await res.json();
      return Object.values(data).map((t: any) => ({
        chainId: chainId,
        address: t.address,
        name: t.name,
        symbol: t.symbol,
        decimals: t.decimals,
        logoURI: t.logoURI,
      }));
    } catch (err) {
      console.error("All token APIs failed", err);
      // 최후의 수단: 기본 토큰 반환
      const def = DEFAULT_TOKENS[chainId];
      return def ? [def.A, def.B] : [];
    }
  }
};

// 2. 유동성 풀 찾기 (체인 검증 강화)
export const findBestPool = async (tokenAddress: string, chainId: number) => {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    );
    const data = await res.json();
    if (!data.pairs || data.pairs.length === 0) return null;

    // [중요] 현재 선택된 체인(slug)과 일치하는 풀만 필터링
    const chainSlug = CHAINS.find((c) => c.id === chainId)?.slug;
    if (!chainSlug) return null;

    // 유동성 $1,000 이상인 풀만 필터링 (이상한 $6 USDT 같은 스캠 풀 방지)
    const pairs = data.pairs
      .filter((p: any) => p.chainId === chainSlug && p.liquidity.usd > 1000)
      .sort((a: any, b: any) => b.liquidity.usd - a.liquidity.usd);

    return pairs[0] || null;
  } catch (e) {
    return null;
  }
};

// 3. 차트 데이터
export const fetchOHLCV = async (
  poolAddress: string,
  timeframe: string,
  chainId: number = 42161
) => {
  try {
    let tfParam = "day";
    let limit = 100;
    let aggregate = 1;

    if (timeframe === "1H") {
      tfParam = "hour";
      aggregate = 1;
    }
    if (timeframe === "4H") {
      tfParam = "hour";
      aggregate = 4;
    }
    if (timeframe === "1D") {
      tfParam = "day";
      aggregate = 1;
      limit = 90;
    }
    if (timeframe === "1W") {
      tfParam = "day";
      aggregate = 1;
      limit = 365;
    }

    const chainSlug = CHAINS.find((c) => c.id === chainId)?.slug || "arbitrum";

    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/${chainSlug}/pools/${poolAddress}/ohlcv/${tfParam}?aggregate=${aggregate}&limit=${limit}`
    );
    const data = await res.json();

    if (!data.data || !data.data.attributes) return [];

    return data.data.attributes.ohlcv_list
      .map((item: number[]) => ({
        time: item[0],
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4],
      }))
      .reverse();
  } catch (e) {
    return [];
  }
};
