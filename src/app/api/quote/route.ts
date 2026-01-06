// src/app/api/quote/route.ts

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
  const tokenIn = searchParams.get("tokenIn");
  const tokenOut = searchParams.get("tokenOut");
  const amount = searchParams.get("amount");
  const chainId = searchParams.get("chainId") || "42161";

  if (!tokenIn || !tokenOut || !amount) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  try {
    const endpoint = "/api/v5/dex/aggregator/quote";
    const queryParams = new URLSearchParams({
      chainIndex: chainId, // [확인] API 문서상 chainIndex
      amount: amount,
      fromTokenAddress: tokenIn,
      toTokenAddress: tokenOut,
      options: "2",
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

    // [수정 1] 실제 라우트 소스(DEX Name) 추출
    // routerResult보다 dexRouterList 내부의 dexName이 더 정확한 경우가 많습니다.
    let dexName = "Aggregator";
    if (result.dexRouterList && result.dexRouterList.length > 0) {
      // 여러 DEX를 거치는 경우 첫 번째 혹은 가장 비중 높은 DEX 표시
      dexName = result.dexRouterList[0].dexName || result.routerResult;
    } else if (result.routerResult) {
      dexName = result.routerResult;
    }

    // [수정 2] Price Impact 추출 (API 문서: priceImpactPercent)
    const priceImpact = result.priceImpactPercent || result.priceImpact || "0";

    return NextResponse.json({
      dstAmount: result.toTokenAmount,
      gasCost: result.txFee || "0",
      priceImpact: priceImpact,
      router: dexName,
    });
  } catch (error: any) {
    console.error("OKX Quote Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote", details: error.message },
      { status: 500 }
    );
  }
}
