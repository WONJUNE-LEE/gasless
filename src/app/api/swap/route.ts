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
  const chainId = searchParams.get("chainId");
  const amount = searchParams.get("amount");
  const fromTokenAddress = searchParams.get("fromTokenAddress");
  const toTokenAddress = searchParams.get("toTokenAddress");
  const userWalletAddress = searchParams.get("userWalletAddress");
  const slippage = searchParams.get("slippage") || "0.5";

  if (
    !chainId ||
    !amount ||
    !fromTokenAddress ||
    !toTokenAddress ||
    !userWalletAddress
  ) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    const endpoint = "/api/v6/dex/aggregator/swap";
    // [수정] OKX API 파라미터 이름은 'slippagePercent' 입니다.
    const queryParams = new URLSearchParams({
      chainIndex: chainId,
      amount,
      fromTokenAddress,
      toTokenAddress,
      userWalletAddress,
      slippagePercent: slippage,
    });

    const queryString = "?" + queryParams.toString();
    const headers = generateOkxHeaders("GET", endpoint, queryString);

    const res = await fetch(`${OKX_API_URL}${endpoint}${queryString}`, {
      method: "GET",
      headers: headers as any,
    });

    const data = await res.json();

    if (data.code !== "0") {
      throw new Error(data.msg || "OKX Swap API Error");
    }

    const txData = data.data[0]?.tx;
    if (!txData) throw new Error("No transaction data received");

    return NextResponse.json(txData);
  } catch (error: any) {
    console.error("OKX Swap Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch swap data", details: error.message },
      { status: 500 }
    );
  }
}
