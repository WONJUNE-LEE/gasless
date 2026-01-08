import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { CHAINS, NATIVE_TOKEN_ADDRESS } from "@/lib/api";

const OKX_API_URL = "https://web3.okx.com";

// 캐시 설정: 메타데이터(소수점 등)는 오래, 랭킹 정보는 짧게
const decimalsCache = new Map<
  string,
  { data: Map<string, number>; timestamp: number }
>();
const topTokensCache = new Map<string, { data: any[]; timestamp: number }>();

const DECIMALS_CACHE_DURATION = 60 * 60 * 1000; // 1시간 (변동 적음)
const TOPLIST_CACHE_DURATION = 2 * 60 * 1000; // 2분 (가격 변동)

// OKX 헤더 생성
function generateOkxHeaders(
  method: string,
  requestPath: string,
  queryString: string
) {
  const apiKey = process.env.OKX_API_KEY!;
  const secretKey = process.env.OKX_SECRET_KEY!;
  const passphrase = process.env.OKX_PASSPHRASE!;

  const timestamp = new Date().toISOString();
  const message = timestamp + method + requestPath + queryString;
  const signature = createHmac("sha256", secretKey)
    .update(message)
    .digest("base64");

  return {
    "Content-Type": "application/json",
    "OK-ACCESS-KEY": apiKey,
    "OK-ACCESS-SIGN": signature,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": passphrase,
    "OK-ACCESS-PROJECT": process.env.OKX_PROJECT_ID!,
  };
}

async function fetchOkxWithRetry(url: string, headers: any, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers,
        next: { revalidate: 0 },
      });
      if (res.ok) return res;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("OKX API Failed");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId") || "1";
  const query = searchParams.get("q");

  const currentChain = CHAINS.find((c) => c.id === parseInt(chainId));
  const wrappedAddress = currentChain?.wrappedTokenAddress?.toLowerCase();

  try {
    // ---------------------------------------------------------
    // [Step 1] Decimals 정보 확보 (All-Tokens API 이용)
    // ---------------------------------------------------------
    let decimalsMap = new Map<string, number>();
    const decimalsCacheKey = `decimals_${chainId}`;
    const cachedDecimals = decimalsCache.get(decimalsCacheKey);

    if (
      cachedDecimals &&
      Date.now() - cachedDecimals.timestamp < DECIMALS_CACHE_DURATION
    ) {
      decimalsMap = cachedDecimals.data;
    } else {
      // decimals 정보를 얻기 위해 aggregator/all-tokens 호출
      const endpoint = "/api/v6/dex/aggregator/all-tokens";
      const queryParams = new URLSearchParams({ chainIndex: chainId });
      const queryString = "?" + queryParams.toString();
      const headers = generateOkxHeaders("GET", endpoint, queryString);

      try {
        const res = await fetchOkxWithRetry(
          `${OKX_API_URL}${endpoint}${queryString}`,
          headers
        );
        const data = await res.json();

        if (data.code === "0" && data.data) {
          data.data.forEach((t: any) => {
            if (t.tokenContractAddress && t.decimals) {
              decimalsMap.set(
                t.tokenContractAddress.toLowerCase(),
                parseInt(t.decimals)
              );
            }
          });
          // 캐시 업데이트
          decimalsCache.set(decimalsCacheKey, {
            data: decimalsMap,
            timestamp: Date.now(),
          });
        }
      } catch (e) {
        console.warn(
          "Failed to fetch all-tokens for decimals, defaulting to 18",
          e
        );
      }
    }

    // ---------------------------------------------------------
    // [Step 2] 토큰 리스트 확보 (Toplist 또는 Search API)
    // ---------------------------------------------------------
    let rawTokens: any[] = [];

    if (query) {
      // 검색 모드
      const endpoint = "/api/v6/dex/market/token/search";
      const queryParams = new URLSearchParams({
        chains: chainId,
        search: query.toLowerCase(),
      });
      const queryString = "?" + queryParams.toString();
      const headers = generateOkxHeaders("GET", endpoint, queryString);
      const res = await fetchOkxWithRetry(
        `${OKX_API_URL}${endpoint}${queryString}`,
        headers
      );
      const data = await res.json();
      rawTokens = data.data || [];
    } else {
      // 랭킹 모드 (Toplist API - 가격, 변동률 포함됨)
      const cacheKey = `top_${chainId}`;
      const cachedTop = topTokensCache.get(cacheKey);

      if (
        cachedTop &&
        Date.now() - cachedTop.timestamp < TOPLIST_CACHE_DURATION
      ) {
        return NextResponse.json(cachedTop.data);
      }

      const endpoint = "/api/v6/dex/market/token/toplist";
      const queryParams = new URLSearchParams({
        chains: chainId,
        sortBy: "6", // MarketCap 순
        timeFrame: "4", // 24h
      });
      const queryString = "?" + queryParams.toString();
      const headers = generateOkxHeaders("GET", endpoint, queryString);
      const res = await fetchOkxWithRetry(
        `${OKX_API_URL}${endpoint}${queryString}`,
        headers
      );
      const data = await res.json();
      rawTokens = data.data || [];
    }

    // ---------------------------------------------------------
    // [Step 3] 데이터 병합 (Toplist 정보 + Decimals Map)
    // ---------------------------------------------------------
    let mappedTokens = rawTokens.map((t: any) => {
      const tokenAddr = t.tokenContractAddress.toLowerCase();
      let isNative = false;

      let finalAddress = t.tokenContractAddress;
      let finalName = t.tokenName;
      let finalSymbol = t.tokenSymbol;

      // Native Token 처리
      if (wrappedAddress && tokenAddr === wrappedAddress) {
        finalAddress = NATIVE_TOKEN_ADDRESS;
        finalName = currentChain?.name || "Native Token";
        finalSymbol = currentChain?.symbol || "ETH";
        isNative = true;
      }

      // [핵심] Decimals 찾기: Map에 있으면 사용, 없으면 Toplist의 decimal, 그것도 없으면 18
      const exactDecimal = decimalsMap.get(tokenAddr);
      const fallbackDecimal = t.decimal || t.decimals || "18";
      const finalDecimal =
        exactDecimal !== undefined ? exactDecimal : parseInt(fallbackDecimal);

      return {
        chainId: parseInt(chainId),
        address: finalAddress,
        name: finalName,
        symbol: finalSymbol,
        decimals: finalDecimal, // 정확한 소수점 적용
        logoURI: t.tokenLogoUrl || t.logoUrl || "",
        price: t.price || t.tokenUnitPrice || "0",
        change24h: t.change || t.change24H || "0", // Toplist의 가격 변동률 적용
        volume24h: t.volume || t.vol24h || "0",
        liquidity: t.liquidity || "0",
        marketCap: t.marketCap || "0",
        isNative: isNative,
        rawMarketCap: parseFloat(t.marketCap || "0"),
      };
    });

    // 중복 제거
    const uniqueTokensMap = new Map();
    mappedTokens.forEach((token: any) => {
      if (!uniqueTokensMap.has(token.address)) {
        uniqueTokensMap.set(token.address, token);
      }
    });
    const uniqueTokens = Array.from(uniqueTokensMap.values());

    // Toplist 캐시 저장 (검색 아닐 때만)
    if (!query) {
      topTokensCache.set(`top_${chainId}`, {
        data: uniqueTokens,
        timestamp: Date.now(),
      });
    }

    return NextResponse.json(uniqueTokens);
  } catch (error: any) {
    console.error(`Fetch Tokens Error (${chainId}):`, error);
    return NextResponse.json(
      { error: "Failed to fetch tokens" },
      { status: 500 }
    );
  }
}
