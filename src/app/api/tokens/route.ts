// src/app/api/tokens/route.ts

import { NextResponse } from "next/server";
import { createHmac } from "crypto";

const OKX_API_URL = "https://www.okx.com";

// 서버 캐시
const topTokensCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000;

function generateOkxHeaders(
  method: string,
  requestPath: string,
  queryString: string
) {
  const apiKey = process.env.OKX_API_KEY!;
  const secretKey = process.env.OKX_SECRET_KEY!;
  const passphrase = process.env.OKX_PASSPHRASE!;
  const projectId = process.env.OKX_PROJECT_ID!;

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
    "OK-ACCESS-PROJECT": projectId,
  };
}

// [신규] OKX API 호출 재시도 함수 (Backend)
async function fetchOkxWithRetry(url: string, headers: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { method: "GET", headers });
      if (res.ok) return res;
      if (res.status >= 400 && res.status < 500)
        throw new Error(`OKX Client Error: ${res.status}`);
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
  const isTop = searchParams.get("type") === "top";

  // 1. [검색 모드]
  if (query) {
    try {
      const endpoint = "/api/v5/dex/market/token/search";
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

      return NextResponse.json(mapTokenData(data.data, chainId));
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // 2. [상위 토큰 모드]
  const cacheKey = `top_${chainId}`;
  const cached = topTokensCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json(cached.data);
  }

  try {
    const endpoint = "/api/v5/dex/aggregator/all-tokens";
    const queryParams = new URLSearchParams({ chainIndex: chainId });
    const queryString = "?" + queryParams.toString();
    const headers = generateOkxHeaders("GET", endpoint, queryString);

    const res = await fetchOkxWithRetry(
      `${OKX_API_URL}${endpoint}${queryString}`,
      headers
    );
    const data = await res.json();

    if (data.code !== "0") throw new Error(data.msg);

    // 데이터 매핑
    let tokens = mapTokenData(data.data, chainId);

    // 유동성 정렬
    tokens.sort(
      (a, b) => parseFloat(b.liquidity || "0") - parseFloat(a.liquidity || "0")
    );

    const topTokens = tokens.slice(0, 20);
    topTokensCache.set(cacheKey, { data: topTokens, timestamp: Date.now() });

    return NextResponse.json(topTokens);
  } catch (error: any) {
    console.error(`Fetch Top Tokens Error (${chainId}):`, error);
    if (cached) return NextResponse.json(cached.data);
    return NextResponse.json(
      { error: "Failed to fetch tokens" },
      { status: 500 }
    );
  }
}

// [수정] 데이터 매핑 함수 (Volume 0 해결, Logo 적용)
function mapTokenData(rawList: any[], chainId: string) {
  return rawList.map((t: any) => ({
    chainId: parseInt(chainId),
    address: t.tokenContractAddress,
    name: t.tokenName,
    symbol: t.tokenSymbol,
    decimals: parseInt(t.decimals || "18"),
    // [수정] 제공된 문서에 따라 tokenLogoUrl 사용
    logoURI: t.tokenLogoUrl || t.logoUrl || "",

    price: t.price || t.unitPrice || "0",
    change24h: t.change24H || t.change || "0",

    // [수정] Volume 필드 다양화: vol24h, volCcy24h, volume 등 확인
    volume24h: t.volume24H || t.vol24h || t.volCcy24h || t.volume || "0",

    liquidity: t.liquidity || "0",
    marketCap: t.marketCap || "0",
  }));
}
