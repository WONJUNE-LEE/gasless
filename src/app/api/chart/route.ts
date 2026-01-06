// src/app/api/chart/route.ts

import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { CHAINS, NATIVE_TOKEN_ADDRESS } from "@/lib/api";

const OKX_API_URL = "https://web3.okx.com"; // [수정] v6 Base URL

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId");
  let tokenAddress = searchParams.get("tokenAddress");
  const timeframe = searchParams.get("timeframe") || "1D";

  if (!chainId || !tokenAddress) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // [핵심] 차트용 주소 변환: Native Token(0xeeee...) -> Wrapped Token
  if (tokenAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS) {
    const chainConfig = CHAINS.find((c) => c.id === parseInt(chainId));
    if (chainConfig?.wrappedTokenAddress) {
      tokenAddress = chainConfig.wrappedTokenAddress;
    }
  }

  // v6 Timeframe 매핑
  let bar = "1D"; // 기본값
  if (timeframe === "1H") bar = "1H";
  if (timeframe === "4H") bar = "4H";
  if (timeframe === "1W") bar = "1W";

  try {
    const endpoint = "/api/v6/dex/market/candles"; // [수정] v6

    const queryParams = new URLSearchParams({
      chainIndex: chainId,
      tokenContractAddress: tokenAddress.toLowerCase(),
      bar: bar,
      limit: "100",
    });

    const queryString = "?" + queryParams.toString();
    const headers = generateOkxHeaders("GET", endpoint, queryString);

    const res = await fetch(`${OKX_API_URL}${endpoint}${queryString}`, {
      method: "GET",
      headers: headers as any,
    });

    const data = await res.json();
    if (data.code !== "0") {
      throw new Error(data.msg || "OKX Chart API Error");
    }

    // v6 Response: [ts, o, h, l, c, vol, volUsd, confirm]
    const ohlcv = data.data
      .map((item: string[]) => ({
        time: parseInt(item[0]) / 1000,
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volUsd: item[6] ? parseFloat(item[6]) : 0,
      }))
      .reverse();

    ohlcv.sort((a: any, b: any) => a.time - b.time);

    return NextResponse.json(ohlcv);
  } catch (error: any) {
    console.error("Chart Route Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chart", details: error.message },
      { status: 500 }
    );
  }
}
