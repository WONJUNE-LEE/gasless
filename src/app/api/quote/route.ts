import { NextResponse } from "next/server";
import { ethers } from "ethers";

// 아비트럼 RPC (안정적인 노드)
const ARBITRUM_RPC = "https://1rpc.io/arb";

const QUOTER_CONTRACT_ADDRESS = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e";

// 🔴 중요 수정: amountIn을 uint24 -> uint256으로 변경
const QUOTER_ABI = [
  "function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
];

const TOKENS: Record<string, string> = {
  ETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
  USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
  USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  WBTC: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
};

// 수수료 티어 (0.05%, 0.3%, 1%)
const FEE_TIERS = [500, 3000, 10000];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromSymbol = searchParams.get("fromToken");
  const toSymbol = searchParams.get("toToken");
  const amountIn = searchParams.get("amount");

  if (!fromSymbol || !toSymbol || !amountIn) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  console.log(
    `[Quote Request] ${fromSymbol} -> ${toSymbol}, Amount: ${amountIn}`
  );

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const quoterContract = new ethers.Contract(
      QUOTER_CONTRACT_ADDRESS,
      QUOTER_ABI,
      provider
    );

    const tokenIn = TOKENS[fromSymbol];
    const tokenOut = TOKENS[toSymbol];

    if (!tokenIn || !tokenOut) {
      return NextResponse.json({ error: `Unsupported token` }, { status: 400 });
    }

    let amountOut = null;
    let usedFee = 0;

    // 여러 수수료 풀 순회
    for (const fee of FEE_TIERS) {
      try {
        const params = {
          tokenIn: tokenIn,
          tokenOut: tokenOut,
          amountIn: amountIn, // 이제 큰 숫자도 잘 들어갑니다
          fee: fee,
          sqrtPriceLimitX96: 0,
        };

        // staticCall 시도
        const result = await quoterContract.quoteExactInputSingle.staticCall(
          params
        );
        amountOut = result.amountOut.toString();
        usedFee = fee;

        // 성공하면 멈춤
        break;
      } catch (e) {
        continue;
      }
    }

    if (!amountOut) {
      throw new Error("No liquidity pool found");
    }

    console.log(`[Quote Success] Fee: ${usedFee}, Out: ${amountOut}`);

    return NextResponse.json({
      dstAmount: amountOut,
      gasCost: { value: "0" },
      priceImpact: "0",
    });
  } catch (error: any) {
    console.error("SERVER ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote", details: error.message },
      { status: 500 }
    );
  }
}
