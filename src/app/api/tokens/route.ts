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
      // 400/500 에러라도 JSON 응답을 확인하기 위해 그냥 리턴할 수도 있음
      // 여기서는 OK가 아니면 에러로 간주하되, 400대 에러는 그냥 빈 값 처리 유도 가능
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
        if (data.code === "0" && Array.isArray(data.data)) {
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

      try {
        const res = await fetchOkxWithRetry(
          `${OKX_API_URL}${endpoint}${queryString}`,
          headers
        );
        const data = await res.json();
        rawTokens = data.data || [];
      } catch (e) {
        console.warn(`Failed to fetch toplist for chain ${chainId}`, e);
        rawTokens = []; // 실패 시 빈 배열
      }
    }

    // [수정] rawTokens가 배열이 아닌 경우 방어 코드 (Berachain 등 미지원 체인 대응)
    if (!Array.isArray(rawTokens)) {
      console.warn(`Invalid rawTokens format for chain ${chainId}`, rawTokens);
      rawTokens = [];
    }

    // ---------------------------------------------------------
    // [Step 3] 데이터 매핑 (Native / Wrapped 분리 로직 적용)
    // ---------------------------------------------------------
    const mappedTokens = rawTokens
      .filter((t: any) => t && t.tokenContractAddress)
      .flatMap((t: any) => {
        // map -> flatMap으로 변경
        const tokenAddr = t.tokenContractAddress.toLowerCase();

        // 공통 데이터 추출
        let finalDecimal = 18;
        if (t.decimal) finalDecimal = parseInt(t.decimal);
        else if (t.decimals) finalDecimal = parseInt(t.decimals);
        else if (decimalsMap.has(tokenAddr))
          finalDecimal = decimalsMap.get(tokenAddr)!;

        const baseTokenData = {
          chainId: parseInt(chainId),
          logoURI: t.tokenLogoUrl || t.logoUrl || "",
          price: t.price || t.tokenUnitPrice || "0",
          change24h: t.change || t.change24H || "0",
          volume24h: t.volume || t.vol24h || "0",
          liquidity: t.liquidity || "0",
          marketCap: t.marketCap || "0",
          rawMarketCap: parseFloat(t.marketCap || "0"),
        };

        const resultTokens = [];

        // 1. Wrapped Token (원본 데이터 그대로 사용)
        // Wrapped 주소여도 무조건 Wrapped 버전은 하나 추가합니다.
        resultTokens.push({
          ...baseTokenData,
          address: t.tokenContractAddress, // 원본 주소
          name: t.tokenName,
          symbol: t.tokenSymbol, // 예: WETH, WMON
          decimals: finalDecimal,
          isNative: false,
        });

        // 2. Native Token (Wrapped 주소와 일치할 경우 가상의 Native 토큰 추가)
        if (wrappedAddress && tokenAddr === wrappedAddress) {
          resultTokens.push({
            ...baseTokenData,
            address: NATIVE_TOKEN_ADDRESS, // 0xeeee...
            name: currentChain?.name || "Native Token", // 예: Ethereum
            symbol: currentChain?.symbol || "ETH", // 예: ETH, MON
            decimals: 18, // Native는 통상 18
            isNative: true,
          });
        }

        return resultTokens;
      });

    // 중복 제거
    const uniqueTokensMap = new Map();
    mappedTokens.forEach((token: any) => {
      if (!uniqueTokensMap.has(token.address.toLowerCase())) {
        uniqueTokensMap.set(token.address.toLowerCase(), token);
      }
    });

    const uniqueTokens = Array.from(uniqueTokensMap.values());

    if (!query && uniqueTokens.length > 0) {
      topTokensCache.set(`top_${chainId}`, {
        data: uniqueTokens,
        timestamp: Date.now(),
      });
    }

    return NextResponse.json(uniqueTokens);
  } catch (error: any) {
    console.error(`Fetch Tokens Error (${chainId}):`, error);
    // 500 에러 대신 빈 배열 반환하여 프론트엔드 크래시 방지
    return NextResponse.json([], { status: 200 });
  }
}
