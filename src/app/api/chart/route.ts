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

  // Timeframe 매핑
  let bar = "1D";
  if (timeframe === "1H") bar = "1H";
  if (timeframe === "4H") bar = "4H";
  if (timeframe === "1W") bar = "1W";

  try {
    const endpoint = "/api/v5/dex/market/candles";

    // [수정 핵심] chainId -> chainIndex 변경
    const queryParams = new URLSearchParams({
      chainIndex: chainId,
      tokenContractAddress: tokenAddress.toLowerCase(), // 주소 소문자 확인
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

    // [수정 6] Volume 데이터 포함 (volUsd)
    const ohlcv = data.data
      .map((item: string[]) => ({
        time: parseInt(item[0]) / 1000,
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        // index 5: vol (base currency), index 6: volUsd (quote currency)
        // 안전하게 파싱
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
