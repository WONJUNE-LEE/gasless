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

    // 문서상 priceImpactPercentString 이지만, 경우에 따라 다른 필드로 올 수 있어 안전하게 처리
    const priceImpact =
      result.priceImpactPercentString ||
      result.priceImpactPercent ||
      result.priceImpact ||
      "0";

    // [수정] 라우터 이름 추출 로직 단순화
    const dexName =
      result.dexRouterList?.[0]?.dexName || result.router || "Aggregator";

    return NextResponse.json({
      dstAmount: result.toTokenAmount,
      gasCost: result.txFee || "0",
      priceImpact: priceImpact, // 수정된 변수 사용
      router: dexName,
      // [추가] 유닛 가격 정보도 필요하면 넘겨줄 수 있음
      tokenPrice: result.tokenUnitPrice,
    });
  } catch (error: any) {
    console.error("OKX Quote Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote", details: error.message },
      { status: 500 }
    );
  }
}
