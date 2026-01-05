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

// 2. 유동성 풀 찾기
export const findBestPool = async (tokenAddress: string) => {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    );
    const data = await res.json();
    if (!data.pairs || data.pairs.length === 0) return null;
    const arbPairs = data.pairs
      .filter(
        (p: any) => p.chainId === "arbitrum" && p.dexId.includes("uniswap")
      )
      .sort((a: any, b: any) => b.liquidity.usd - a.liquidity.usd);
    return arbPairs[0] || null;
  } catch (e) {
    return null;
  }
};

// 3. 차트 데이터 (기간 변경 지원)
export const fetchOHLCV = async (poolAddress: string, timeframe: string) => {
  try {
    // GeckoTerminal API 매핑 (day, hour, minute)
    let tfParam = "day";
    let limit = 100;

    // 1H, 4H -> hour, 1D, 1W -> day
    if (timeframe === "1H" || timeframe === "4H") tfParam = "hour";
    if (timeframe === "1M") tfParam = "day"; // Free API 한계로 day로 대체

    // Aggregate (1시간, 4시간 등)
    let aggregate = 1;
    if (timeframe === "4H") aggregate = 4;
    if (timeframe === "1W") aggregate = 7;

    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/arbitrum/pools/${poolAddress}/ohlcv/${tfParam}?aggregate=${aggregate}&limit=${limit}`
    );
    const data = await res.json();

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
