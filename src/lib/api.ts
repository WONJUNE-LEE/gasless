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
  },
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
  price?: string;
  change24h?: string;
  volume24h?: string;
  liquidity?: string;
  marketCap?: string;
}

export const NATIVE_TOKEN_ADDRESS =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

// 차트/마켓 데이터 조회를 위한 네이티브 -> 래핑 토큰 매핑
const WRAPPED_TOKENS: Record<number, string> = {
  1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // ETH -> WETH
  42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // Arb ETH -> WETH
  56: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // BNB -> WBNB
  137: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // MATIC -> WMATIC (POL)
  10: "0x4200000000000000000000000000000000000006", // OP ETH -> WETH
  8453: "0x4200000000000000000000000000000000000006", // Base ETH -> WETH
  43114: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // AVAX -> WAVAX
  324: "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91", // zkSync ETH -> WETH
  59144: "0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f", // Linea ETH -> WETH
  5000: "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8", // Mantle MNT -> WMNT
  534352: "0x5300000000000000000000000000000000000004", // Scroll ETH -> WETH
  250: "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83", // Fantom FTM -> WFTM
  100: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d", // Gnosis xDAI -> WXDAI
  1088: "0x75cb093E4D94692d0fd866ae105633c72c693446", // Metis -> WMetis
  196: "0xe538905cf8410324e036e773c85f34bc0f500bd2", // X Layer OKB -> WOKB
  81457: "0x4300000000000000000000000000000000000004", // Blast ETH -> WETH
  // Monad Wrapped Token (Testnet Placeholder or Canonical)
  143: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701", // Monad WMON (Example/Placeholder)
};

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

/// [신규] API 재시도(Retry) 헬퍼 함수
async function fetchWithRetry(
  url: string,
  retries = 3,
  delay = 1000
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (res.status >= 400 && res.status < 500)
        throw new Error(`Client Error: ${res.status}`);
      throw new Error(`Server Error: ${res.status}`);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("All retries failed");
}

// [변경] DEFAULT_TOKENS 리스트 삭제 -> 비상용 단일 Fallback 정의
// 네트워크가 완전히 끊기거나 API가 죽었을 때 앱 크래시 방지용
const FALLBACK_PAIR: { A: TokenInfo; B: TokenInfo } = {
  A: {
    chainId: 0,
    address: NATIVE_TOKEN_ADDRESS,
    name: "Loading...",
    symbol: "---",
    decimals: 18,
    logoURI: "",
  },
  B: {
    chainId: 0,
    address: "0x0000000000000000000000000000000000000000",
    name: "Loading...",
    symbol: "---",
    decimals: 6,
    logoURI: "",
  },
};

// 1. 토큰 리스트 가져오기
export const fetchTokenList = async (
  chainId: number,
  query: string = "",
  type: "search" | "top" = "search"
): Promise<TokenInfo[]> => {
  try {
    const queryParam =
      type === "top"
        ? "&type=top"
        : query
        ? `&q=${encodeURIComponent(query)}`
        : "";
    const endpoint = `/api/tokens?chainId=${chainId}${queryParam}`;

    const res = await fetchWithRetry(endpoint);
    return await res.json();
  } catch (e) {
    console.error("Fetch Tokens Error:", e);
    // 에러 발생 시 빈 배열 반환 (UI에서 로딩 상태나 'No tokens' 처리)
    return [];
  }
};

// 2. 동적 기본 쌍(Pair) 가져오기
export const fetchDefaultPair = async (
  chainId: number
): Promise<{ A: TokenInfo; B: TokenInfo }> => {
  try {
    // 백엔드에서 유동성 상위 토큰 가져오기
    const topTokens = await fetchTokenList(chainId, "", "top");

    if (!topTokens || topTokens.length === 0)
      throw new Error("No tokens found");

    // A: 네이티브 또는 래핑 토큰 찾기
    let tokenA = topTokens.find(
      (t) =>
        t.address.toLowerCase() === NATIVE_TOKEN_ADDRESS ||
        t.symbol.toUpperCase().startsWith("W") // WETH, WBNB 등
    );
    if (!tokenA) tokenA = topTokens[0];

    // B: 스테이블 코인 찾기 (A와 다른 것)
    let tokenB = topTokens.find(
      (t) =>
        t.address.toLowerCase() !== tokenA!.address.toLowerCase() &&
        (t.symbol.toUpperCase().includes("USD") ||
          t.symbol.toUpperCase() === "DAI")
    );
    if (!tokenB) tokenB = topTokens[1] || topTokens[0];

    return { A: tokenA!, B: tokenB! };
  } catch (e) {
    console.error("Auto-detect Default Pair Failed:", e);
    // 실패 시 비상용 Fallback 반환 (Loading... 표시됨)
    return FALLBACK_PAIR;
  }
};

// 3. 토큰 마켓 데이터 가져오기
export const fetchTokenMarketData = async (
  tokenAddress: string,
  chainId: number
): Promise<TokenInfo | null> => {
  try {
    const tokens = await fetchTokenList(chainId, tokenAddress);
    if (tokens && tokens.length > 0) {
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

// 4. 차트 데이터 (Retry 적용 및 Volume 파싱)
export const fetchOHLCV = async (
  tokenAddress: string,
  timeframe: string,
  chainId: number
) => {
  try {
    const res = await fetchWithRetry(
      `/api/chart?chainId=${chainId}&tokenAddress=${tokenAddress}&timeframe=${timeframe}`
    );
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      time: item.time,
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      // [수정 6] Volume 추가
      volume: item.volUsd || 0,
    }));
  } catch (e) {
    console.error("Chart Fetch Error:", e);
    return [];
  }
};
