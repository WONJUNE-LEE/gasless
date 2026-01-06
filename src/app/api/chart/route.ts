// src/app/api/chart/route.ts

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
  const chainId = searchParams.get("chainId");
  const tokenAddress = searchParams.get("tokenAddress");
  const timeframe = searchParams.get("timeframe") || "1D";

  if (!chainId || !tokenAddress) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // Timeframe 매핑 (OKX API 포맷에 맞춤)
  // OKX: 1m, 3m, 5m, 15m, 30m, 1H, 2H, 4H, 6H, 12H, 1D, 1W, 1M
  let bar = "1D";
  if (timeframe === "1H") bar = "1H";
  if (timeframe === "4H") bar = "4H";
  if (timeframe === "1W") bar = "1W";

  try {
    const endpoint = "/api/v5/dex/market/candles";
    const queryParams = new URLSearchParams({
      chainId: chainId,
      tokenContractAddress: tokenAddress.toLowerCase(), // EVM 주소는 소문자 권장
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

    // OKX 응답 포맷: [ts, o, h, l, c, vol, volUsd, confirm]
    // ts는 문자열 밀리초
    const ohlcv = data.data
      .map((item: string[]) => ({
        time: parseInt(item[0]) / 1000, // 초 단위로 변환 (Lightweight Charts)
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
      }))
      .reverse(); // 최신순 -> 과거순 정렬일 경우 reverse 필요 (Lightweight Charts는 오름차순 시간 필요)

    // OKX는 내림차순(최신이 먼저)으로 줄 수 있으므로 시간 오름차순으로 정렬
    ohlcv.sort((a: any, b: any) => a.time - b.time);

    return NextResponse.json(ohlcv);
  } catch (error: any) {
    console.error("OKX Chart Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chart", details: error.message },
      { status: 500 }
    );
  }
}
