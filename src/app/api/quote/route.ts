// src/app/api/quote/route.ts

import { NextResponse } from "next/server";
import { createHmac } from "crypto";

const OKX_API_URL = "https://web3.okx.com";

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
  const chainId = searchParams.get("chainId") || "1";
  const slippage = searchParams.get("slippage") || "0.005"; // 기본 0.5%

  if (!tokenIn || !tokenOut || !amount) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  try {
    const endpoint = "/api/v6/dex/aggregator/quote";
    const queryParams = new URLSearchParams({
      chainIndex: chainId,
      amount: amount,
      fromTokenAddress: tokenIn,
      toTokenAddress: tokenOut,
      priceImpactProtectionPercent: "100",
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
    const priceImpact = result.priceImpactPercent || "0";
    const dexName =
      result.dexRouterList?.[0]?.dexProtocol?.dexName ||
      result.router ||
      "Aggregator";

    return NextResponse.json({
      dstAmount: result.toTokenAmount,
      gasCost: result.tradeFee || "0",
      priceImpact: priceImpact,
      router: dexName,
      tokenPrice: result.toToken?.tokenUnitPrice,
    });
  } catch (error: any) {
    console.error("OKX Quote Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote", details: error.message },
      { status: 500 }
    );
  }
}
