// src/app/api/quote/route.ts

import { NextResponse } from "next/server";
import { createHmac } from "crypto";

/**
 * [OKX Aggregator API 설정]
 * 1. .env 파일에 OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE, OKX_PROJECT_ID 가 있어야 합니다.
 * 2. https://www.okx.com/api/v5/dex/aggregator/quote 엔드포인트를 사용합니다.
 */

const OKX_API_URL = "https://www.okx.com";
const CHAIN_ID = "42161"; // Arbitrum One Chain ID

function generateOkxHeaders(
  method: string,
  requestPath: string,
  queryString: string
) {
  const apiKey = process.env.OKX_API_KEY!;
  const secretKey = process.env.OKX_SECRET_KEY!;
  const passphrase = process.env.OKX_PASSPHRASE!;
  const projectId = process.env.OKX_PROJECT_ID!;

  // 타임스탬프 (ISO)
  const timestamp = new Date().toISOString();

  // 서명 생성: timestamp + method + requestPath + queryString
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
  const tokenIn = searchParams.get("tokenIn");
  const tokenOut = searchParams.get("tokenOut");
  const amount = searchParams.get("amount");

  if (!tokenIn || !tokenOut || !amount) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // API Key가 없으면 에러 (개발자 알림용)
  if (!process.env.OKX_API_KEY) {
    return NextResponse.json(
      { error: "Server Configuration Error: OKX API Key missing" },
      { status: 500 }
    );
  }

  try {
    const endpoint = "/api/v5/dex/aggregator/quote";
    const queryParams = new URLSearchParams({
      chainId: CHAIN_ID,
      amount: amount, // Wei 단위 (e.g., 1000000)
      fromTokenAddress: tokenIn,
      toTokenAddress: tokenOut,
      options: "2", // 라우팅 옵션 등
    });

    const queryString = "?" + queryParams.toString();
    const headers = generateOkxHeaders("GET", endpoint, queryString);

    const res = await fetch(`${OKX_API_URL}${endpoint}${queryString}`, {
      method: "GET",
      headers: headers as any,
    });

    const data = await res.json();

    if (data.code !== "0") {
      throw new Error(data.msg || "OKX API Error");
    }

    const result = data.data[0];

    // OKX 응답 포맷을 기존 UI가 쓰던 포맷으로 변환
    // result.routerResult 등에서 정보 추출 가능
    return NextResponse.json({
      dstAmount: result.toTokenAmount,
      gasCost: result.tradeFee || "0",
      priceImpact: result.priceImpact || "0",
      router: result.routerResult, // 상세 경로 정보
    });
  } catch (error: any) {
    console.error("OKX Quote Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote", details: error.message },
      { status: 500 }
    );
  }
}
