import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { CHAINS, NATIVE_TOKEN_ADDRESS } from "@/lib/api";

const OKX_API_URL = "https://web3.okx.com";

// 서버 캐시 설정 (5분)
const topTokensCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000;

// OKX 헤더 생성 함수
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

// 재시도 로직이 포함된 Fetch 함수
async function fetchOkxWithRetry(url: string, headers: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { method: "GET", headers });
      if (res.ok) return res;
      // 4xx, 5xx 에러 발생 시 에러 throw
      if (res.status >= 400) {
        throw new Error(`OKX Client Error: ${res.status}`);
      }
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("OKX API Failed");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId") || "1";
  const query = searchParams.get("q");

  // 현재 체인 정보 및 Wrapped Token 주소 찾기 (소문자 비교)
  const currentChain = CHAINS.find((c) => c.id === parseInt(chainId));
  const wrappedAddress = currentChain?.wrappedTokenAddress?.toLowerCase();

  try {
    let rawTokens: any[] = [];

    // ---------------------------------------------------------
    // 1. 검색 모드 (Search API)
    // ---------------------------------------------------------
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

      if (data.code !== "0") throw new Error(data.msg);
      rawTokens = data.data || [];
    }
    // ---------------------------------------------------------
    // 2. 상위 토큰 리스트 모드 (Toplist API)
    // ---------------------------------------------------------
    else {
      const cacheKey = `top_${chainId}`;
      const cached = topTokensCache.get(cacheKey);

      // 캐시 유효하면 반환
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return NextResponse.json(cached.data);
      }

      // v6 Toplist API (SortBy 6: MarketCap, TimeFrame 4: 24h)
      const endpoint = "/api/v6/dex/market/token/toplist";
      const queryParams = new URLSearchParams({
        chains: chainId,
        sortBy: "6", // 시가총액 기준 정렬
        timeFrame: "4",
      });
      const queryString = "?" + queryParams.toString();
      const headers = generateOkxHeaders("GET", endpoint, queryString);

      const res = await fetchOkxWithRetry(
        `${OKX_API_URL}${endpoint}${queryString}`,
        headers
      );
      const data = await res.json();

      if (data.code !== "0") throw new Error(data.msg);
      rawTokens = data.data || [];
    }

    // ---------------------------------------------------------
    // 3. 데이터 매핑 및 네이티브 토큰 변환
    // ---------------------------------------------------------
    let mappedTokens = rawTokens.map((t: any) => {
      const tokenAddr = t.tokenContractAddress.toLowerCase();
      let isNative = false;

      // [핵심] Wrapped Token 주소와 일치하면 Native Token으로 변환
      let finalAddress = t.tokenContractAddress;
      let finalName = t.tokenName;
      let finalSymbol = t.tokenSymbol;

      if (wrappedAddress && tokenAddr === wrappedAddress) {
        finalAddress = NATIVE_TOKEN_ADDRESS; // 0xeeee...
        finalName = currentChain?.name || "Native Token";
        finalSymbol = currentChain?.symbol || "ETH";
        isNative = true;
      }

      return {
        chainId: parseInt(chainId),
        address: finalAddress,
        name: finalName,
        symbol: finalSymbol,
        decimals: parseInt(t.decimal || t.decimals || "18"),
        logoURI: t.tokenLogoUrl || t.logoUrl || "",
        price: t.price || t.tokenUnitPrice || "0",
        change24h: t.change || t.change24H || "0",
        volume24h: t.volume || t.vol24h || "0",
        liquidity: t.liquidity || "0",
        marketCap: t.marketCap || "0",
        isNative: isNative,
        // 원본 유동성 값 보존 (정렬용)
        rawLiquidity: parseFloat(t.liquidity || "0"),
        rawMarketCap: parseFloat(t.marketCap || "0"),
      };
    });

    // ---------------------------------------------------------
    // 4. 중복 제거 (address 기준)
    // ---------------------------------------------------------
    const uniqueTokensMap = new Map();

    mappedTokens.forEach((token: any) => {
      // 이미 존재하는 주소면 건너뜀 (리스트 순서상 상위 항목 우선)
      if (!uniqueTokensMap.has(token.address)) {
        uniqueTokensMap.set(token.address, token);
      }
    });

    const uniqueTokens = Array.from(uniqueTokensMap.values());

    // ---------------------------------------------------------
    // 5. 최종 정렬 (네이티브 우선 -> 시가총액 순) 및 캐시 저장
    // ---------------------------------------------------------
    if (!query) {
      uniqueTokens.sort((a: any, b: any) => {
        // 1순위: 네이티브 토큰
        if (a.isNative && !b.isNative) return -1;
        if (!a.isNative && b.isNative) return 1;

        // 2순위: 시가총액 (내림차순)
        return b.rawMarketCap - a.rawMarketCap;
      });

      // [수정] cacheKey 변수 대신 직접 키 생성
      topTokensCache.set(`top_${chainId}`, {
        data: uniqueTokens,
        timestamp: Date.now(),
      });
    }

    return NextResponse.json(uniqueTokens);
  } catch (error: any) {
    console.error(`Fetch Tokens Error (${chainId}):`, error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tokens" },
      { status: 500 }
    );
  }
}
