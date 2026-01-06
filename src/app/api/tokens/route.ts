// src/app/api/tokens/route.ts

import { NextResponse } from "next/server";
import { createHmac } from "crypto";

const OKX_API_URL = "https://www.okx.com";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId") || "1";
  const query = searchParams.get("q");

  if (!process.env.OKX_API_KEY) {
    return NextResponse.json({ error: "API Key missing" }, { status: 500 });
  }

  try {
    let endpoint = "";
    let queryParams = new URLSearchParams();

    // 검색어(q) 유무에 따라 분기
    if (query) {
      // 1. 검색/상세 모드: OKX Token Search API (유동성/가격 정보 포함)
      endpoint = "/api/v5/dex/market/token/search";
      queryParams.append("chainId", chainId);
      queryParams.append("search", query); // 주소나 심볼로 검색
    } else {
      // 2. 기본 목록: OKX Aggregator All Tokens
      endpoint = "/api/v5/dex/aggregator/all-tokens";
      queryParams.append("chainId", chainId);
    }

    const queryString = "?" + queryParams.toString();
    const headers = generateOkxHeaders("GET", endpoint, queryString);

    const res = await fetch(`${OKX_API_URL}${endpoint}${queryString}`, {
      method: "GET",
      headers: headers as any,
    });

    const data = await res.json();

    if (data.code !== "0") {
      // Monad 등 미지원 체인일 경우 빈 배열 반환하여 UI 오류 방지
      console.warn(`OKX API Warning (${chainId}):`, data.msg);
      return NextResponse.json([]);
    }

    // 데이터 포맷 정규화 및 상세 정보 매핑
    // OKX API 필드명은 상황에 따라 다를 수 있어 옵셔널 체이닝 사용
    const tokens = data.data.map((t: any) => ({
      chainId: parseInt(chainId),
      address: t.tokenContractAddress,
      name: t.tokenName,
      symbol: t.tokenSymbol,
      decimals: parseInt(t.decimals || "18"),
      logoURI: t.tokenLogoUrl,
      // 상세 정보 (Search API에서 제공)
      price: t.price || "0",
      change24h: t.change24H || t.change || "0", // API 버전에 따라 필드명 상이
      volume24h: t.volume24H || "0",
      liquidity: t.liquidity || "0",
      marketCap: t.marketCap || "0",
    }));

    return NextResponse.json(tokens);
  } catch (error: any) {
    console.error("OKX Token List Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tokens", details: error.message },
      { status: 500 }
    );
  }
}
