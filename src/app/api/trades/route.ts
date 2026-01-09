// src/app/api/trades/route.ts
import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { CHAINS, NATIVE_TOKEN_ADDRESS } from "@/lib/api";

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
  let tokenAddress = searchParams.get("tokenAddress");

  if (!chainId || !tokenAddress) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // Native Token 처리
  if (tokenAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS) {
    const chainConfig = CHAINS.find((c) => c.id === parseInt(chainId));
    if (chainConfig?.wrappedTokenAddress) {
      tokenAddress = chainConfig.wrappedTokenAddress;
    }
  }

  try {
    const endpoint = "/api/v6/dex/market/trades";
    const queryParams = new URLSearchParams({
      chainIndex: chainId,
      tokenContractAddress: tokenAddress!.toLowerCase(),
      limit: "50",
    });

    const queryString = "?" + queryParams.toString();
    const headers = generateOkxHeaders("GET", endpoint, queryString);

    const res = await fetch(`${OKX_API_URL}${endpoint}${queryString}`, {
      method: "GET",
      headers: headers as any,
      next: { revalidate: 15 },
    });

    const data = await res.json();
    if (data.code !== "0") {
      // 에러가 아니라 데이터가 없는 경우일 수 있으므로 빈 배열 반환
      return NextResponse.json([]);
    }

    const targetAddr = tokenAddress!.toLowerCase();

    const trades = data.data.map((t: any) => {
      // [수정 1] 안전한 접근 (Optional Chaining)
      // changedTokenInfo가 없거나 비어있을 수 있으므로 예외 처리
      let tradeAmount = 0;
      let symbol = "Token";

      if (Array.isArray(t.changedTokenInfo)) {
        const changedInfo = t.changedTokenInfo.find(
          (ct: any) => ct?.tokenContractAddress?.toLowerCase() === targetAddr
        );
        if (changedInfo) {
          tradeAmount = parseFloat(changedInfo.amount || "0");
          symbol = changedInfo.tokenSymbol || symbol;
        } else if (t.changedTokenInfo.length > 0) {
          // 타겟 토큰 정보가 없으면 첫 번째 토큰 정보라도 표시 (상대 토큰일 수 있음)
          symbol = t.changedTokenInfo[0].tokenSymbol;
        }
      }

      return {
        id: t.id || Math.random().toString(),
        time: parseInt(t.time),
        type: t.type === "buy" ? "buy" : "sell",
        price: parseFloat(t.price || "0"),
        amount: tradeAmount, // 0일 수도 있음
        volume: parseFloat(t.volume || "0"),
        txHash: t.txHashUrl ? t.txHashUrl.split("/").pop() : "",
        userAddress: t.userAddress || "",
        baseSymbol: symbol,
        quoteSymbol: "USD",
      };
    });

    // [수정 2] 필터 제거: amount가 0이어도 API가 준 데이터라면 표시 (사용자가 거래 발생 여부를 아는 것이 중요)
    // const validTrades = trades.filter((t: any) => t.amount > 0);

    return NextResponse.json(trades);
  } catch (error: any) {
    console.error("Trades Route Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
