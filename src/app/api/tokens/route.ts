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
  const chainId = searchParams.get("chainId") || "42161"; // Default Arbitrum

  if (!process.env.OKX_API_KEY) {
    return NextResponse.json({ error: "API Key missing" }, { status: 500 });
  }

  try {
    // OKX Aggregator Token List API
    const endpoint = "/api/v5/dex/aggregator/all-tokens";
    const queryParams = new URLSearchParams({
      chainId: chainId,
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

    // 데이터 포맷 정규화
    const tokens = data.data.map((t: any) => ({
      chainId: parseInt(chainId),
      address: t.tokenContractAddress,
      name: t.tokenName,
      symbol: t.tokenSymbol,
      decimals: parseInt(t.decimals),
      logoURI: t.tokenLogoUrl,
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
