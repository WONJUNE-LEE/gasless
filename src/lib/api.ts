// src/lib/api.ts

const TOKEN_LIST_URL = "https://bridge.arbitrum.io/token-list-42161.json";

export interface TokenInfo {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
}

// 1. 토큰 리스트
export const fetchTokenList = async (): Promise<TokenInfo[]> => {
  try {
    const res = await fetch(TOKEN_LIST_URL);
    const data = await res.json();
    return data.tokens;
  } catch (e) {
    console.error(e);
    return [];
  }
};

// 2. 유동성 풀 찾기 (상세 정보 포함)
export const findBestPool = async (tokenAddress: string) => {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    );
    const data = await res.json();
    if (!data.pairs || data.pairs.length === 0) return null;

    // Arbitrum 체인, Uniswap 우선 필터링
    const arbPairs = data.pairs
      .filter((p: any) => p.chainId === "arbitrum")
      .sort((a: any, b: any) => b.liquidity.usd - a.liquidity.usd);

    // 가장 유동성 높은 풀 반환
    return arbPairs[0] || null;
  } catch (e) {
    return null;
  }
};

// 3. 차트 데이터 (1W 수정됨)
export const fetchOHLCV = async (poolAddress: string, timeframe: string) => {
  try {
    // GeckoTerminal API 매핑
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

    // [수정] 1D: 1일봉
    if (timeframe === "1D") {
      tfParam = "day";
      aggregate = 1;
      limit = 90;
    }

    // [수정] 1W: API가 주봉을 직접 지원하지 않는 경우가 많아
    // 일봉(day)을 길게(365개) 가져와서 차트가 줌아웃된 효과를 줍니다.
    if (timeframe === "1W") {
      tfParam = "day";
      aggregate = 1;
      limit = 365;
    }

    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/arbitrum/pools/${poolAddress}/ohlcv/${tfParam}?aggregate=${aggregate}&limit=${limit}`
    );
    const data = await res.json();

    if (!data.data || !data.data.attributes) return [];

    const candles = data.data.attributes.ohlcv_list
      .map((item: number[]) => ({
        time: item[0],
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4],
      }))
      .reverse();

    return candles;
  } catch (e) {
    console.error(e);
    return [];
  }
};
