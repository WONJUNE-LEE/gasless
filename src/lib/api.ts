// src/lib/api.ts

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
  }, // [신규] Monad 추가
  {
    id: 324,
    name: "zkSync Era",
    symbol: "ETH",
    logo: "https://assets.coingecko.com/coins/images/27690/small/zksync-lite.png",
    slug: "zksync",
  },
  {
    id: 59144,
    name: "Linea",
    symbol: "ETH",
    logo: "https://assets.coingecko.com/coins/images/31003/small/linea.png",
    slug: "linea",
  },
  {
    id: 5000,
    name: "Mantle",
    symbol: "MNT",
    logo: "https://assets.coingecko.com/coins/images/30980/small/token-logo.png",
    slug: "mantle",
  },
  {
    id: 534352,
    name: "Scroll",
    symbol: "ETH",
    logo: "https://assets.coingecko.com/coins/images/26938/small/scroll-zkp.jpg",
    slug: "scroll",
  },
  {
    id: 250,
    name: "Fantom",
    symbol: "FTM",
    logo: "https://assets.coingecko.com/coins/images/4001/small/Fantom_round.png",
    slug: "fantom",
  },
  {
    id: 100,
    name: "Gnosis",
    symbol: "xDAI",
    logo: "https://assets.coingecko.com/coins/images/11062/small/Identity-Primary-Dark.png",
    slug: "gnosis",
  },
  {
    id: 1088,
    name: "Metis",
    symbol: "METIS",
    logo: "https://assets.coingecko.com/coins/images/15595/small/metis.PNG",
    slug: "metis",
  },
  {
    id: 196,
    name: "X Layer",
    symbol: "OKB",
    logo: "https://assets.coingecko.com/coins/images/4463/small/WeChat_Image_20220118095654.png",
    slug: "x_layer",
  },
  {
    id: 81457,
    name: "Blast",
    symbol: "ETH",
    logo: "https://assets.coingecko.com/coins/images/35496/small/Blast.jpg",
    slug: "blast",
  },
];

export interface TokenInfo {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  // OKX API에서 오는 추가 정보
  price?: string;
  change24h?: string;
  volume24h?: string;
  liquidity?: string;
  marketCap?: string;
}

// DEFAULT_TOKENS: 앱 초기 로딩 시 빈 화면을 방지하기 위한 Placeholder 역할입니다.
// 실제 데이터는 컴포넌트 마운트 후 OKX API를 통해 즉시 업데이트됩니다.
export const DEFAULT_TOKENS: Record<number, { A: TokenInfo; B: TokenInfo }> = {
  42161: {
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
  // ... (다른 체인들은 필요 시 추가, 없으면 코드에서 Fallback 처리됨)
};

// 1. 토큰 리스트 가져오기 (OKX API)
export const fetchTokenList = async (
  chainId: number,
  query: string = ""
): Promise<TokenInfo[]> => {
  try {
    const endpoint = `/api/tokens?chainId=${chainId}${
      query ? `&q=${encodeURIComponent(query)}` : ""
    }`;
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error("API Failed");
    return await res.json();
  } catch (e) {
    console.error("Fetch Tokens Error:", e);
    // 실패 시 기본 토큰 반환하여 크래시 방지
    const def = DEFAULT_TOKENS[chainId] || DEFAULT_TOKENS[42161];
    return [def.A, def.B];
  }
};

// 2. [신규] 토큰 마켓 데이터 가져오기 (OKX API Only)
// DexScreener를 완전히 대체합니다.
export const fetchTokenMarketData = async (
  tokenAddress: string,
  chainId: number
): Promise<TokenInfo | null> => {
  try {
    // OKX의 토큰 검색 API를 활용하여 상세 정보를 가져옵니다.
    const tokens = await fetchTokenList(chainId, tokenAddress);
    if (tokens && tokens.length > 0) {
      // 검색 결과 중 주소가 정확히 일치하는 토큰을 찾습니다.
      const match = tokens.find(
        (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
      );
      return match || tokens[0];
    }
    return null;
  } catch (e) {
    console.error("Token Market Data Error:", e);
    return null;
  }
};

// 3. 차트 데이터 (OKX Market API 사용)
// poolAddress 인자에 실제로는 tokenAddress가 들어옵니다.
export const fetchOHLCV = async (
  tokenAddress: string,
  timeframe: string,
  chainId: number
) => {
  try {
    const res = await fetch(
      `/api/chart?chainId=${chainId}&tokenAddress=${tokenAddress}&timeframe=${timeframe}`
    );
    if (!res.ok) throw new Error("Chart API Failed");

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      time: item.time,
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
    }));
  } catch (e) {
    console.error("Chart Fetch Error:", e);
    return [];
  }
};
