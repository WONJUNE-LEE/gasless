import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { CHAINS, NATIVE_TOKEN_ADDRESS } from "@/lib/api";

const OKX_API_URL = "https://web3.okx.com";

// 캐시 설정
const decimalsCache = new Map<
  string,
  { data: Map<string, number>; timestamp: number }
>();
const topTokensCache = new Map<string, { data: any[]; timestamp: number }>();

const DECIMALS_CACHE_DURATION = 60 * 60 * 1000; // 1시간
const TOPLIST_CACHE_DURATION = 2 * 60 * 1000; // 2분

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
    // [Step 1] Decimals 캐시 준비 (보조 수단)
    // ---------------------------------------------------------
    let decimalsMap = new Map<string, number>();
    const decimalsCacheKey = `decimals_${chainId}`;
    const cachedDecimals = decimalsCache.get(decimalsCacheKey);

    // 캐시가 유효하면 사용, 아니면 백그라운드나 필요시 갱신 (여기서는 동기적으로 처리하되 실패 시 무시)
    if (
      cachedDecimals &&
      Date.now() - cachedDecimals.timestamp < DECIMALS_CACHE_DURATION
    ) {
      decimalsMap = cachedDecimals.data;
    } else {
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
          decimalsCache.set(decimalsCacheKey, {
            data: decimalsMap,
            timestamp: Date.now(),
          });
        }
      } catch (e) {
        console.warn("Decimals fetch warning:", e);
      }
    }

    // ---------------------------------------------------------
    // [Step 2] 토큰 목록 Fetch (Search or Toplist)
    // ---------------------------------------------------------
    let rawTokens: any[] = [];

    if (query) {
      const endpoint = "/api/v6/dex/market/token/search";
      const queryParams = new URLSearchParams({
        chains: chainId,
        search: query.toLowerCase(), // 주소 검색 시 소문자 변환 권장
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
      // 랭킹 모드
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
        sortBy: "6", // MarketCap
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
    // [Step 3] 데이터 매핑 및 Decimals 보정
    // ---------------------------------------------------------
    const mappedTokens = rawTokens
      .filter((t: any) => t.tokenContractAddress) // 주소 없는 데이터 필터링
      .map((t: any) => {
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

        // [수정 핵심] Decimals 우선순위 변경
        // 1. API 응답의 decimal 필드 (search 결과 등)
        // 2. all-tokens 캐시 맵
        // 3. 기본값 18
        let finalDecimal = 18;
        if (t.decimal) {
          finalDecimal = parseInt(t.decimal);
        } else if (t.decimals) {
          finalDecimal = parseInt(t.decimals);
        } else if (decimalsMap.has(tokenAddr)) {
          finalDecimal = decimalsMap.get(tokenAddr)!;
        }

        return {
          chainId: parseInt(chainId),
          address: finalAddress,
          name: finalName,
          symbol: finalSymbol,
          decimals: finalDecimal,
          logoURI: t.tokenLogoUrl || t.logoUrl || "",
          price: t.price || t.tokenUnitPrice || "0",
          change24h: t.change || t.change24H || "0",
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
      // 주소 기준으로 중복 제거
      if (!uniqueTokensMap.has(token.address.toLowerCase())) {
        uniqueTokensMap.set(token.address.toLowerCase(), token);
      }
    });

    const uniqueTokens = Array.from(uniqueTokensMap.values());

    // Toplist일 경우만 캐싱
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
