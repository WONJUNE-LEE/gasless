import { NextResponse } from "next/server";
import { ethers } from "ethers";

// 아비트럼 RPC (안정적인 노드)
const ARBITRUM_RPC = "https://1rpc.io/arb";

const QUOTER_CONTRACT_ADDRESS = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e";

const QUOTER_ABI = [
  "function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
];

// 수수료 티어 (0.05%, 0.3%, 1%)
const FEE_TIERS = [500, 3000, 10000];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // [수정] 심볼이 아닌 주소(Address)를 직접 받습니다.
  const tokenIn = searchParams.get("tokenIn");
  const tokenOut = searchParams.get("tokenOut");
  const amountIn = searchParams.get("amount");

  if (!tokenIn || !tokenOut || !amountIn) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // console.log(`[Quote Request] ${tokenIn} -> ${tokenOut}, Amount: ${amountIn}`);

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const quoterContract = new ethers.Contract(
      QUOTER_CONTRACT_ADDRESS,
      QUOTER_ABI,
      provider
    );

    let bestAmountOut = BigInt(0);
    let usedFee = 0;

    // 여러 수수료 풀 순회하여 최적의 경로 찾기
    for (const fee of FEE_TIERS) {
      try {
        const params = {
          tokenIn: tokenIn,
          tokenOut: tokenOut,
          amountIn: amountIn,
          fee: fee,
          sqrtPriceLimitX96: 0,
        };

        // staticCall 시도 (가스비 소모 없음)
        const result = await quoterContract.quoteExactInputSingle.staticCall(
          params
        );

        const amountOut = BigInt(result.amountOut);

        // 더 많은 출력을 주는 풀 선택
        if (amountOut > bestAmountOut) {
          bestAmountOut = amountOut;
          usedFee = fee;
        }
      } catch (e) {
        // 해당 티어에 유동성이 없으면 무시하고 다음 티어로
        continue;
      }
    }

    if (bestAmountOut === BigInt(0)) {
      throw new Error("No liquidity pool found");
    }

    // console.log(`[Quote Success] Fee: ${usedFee}, Out: ${bestAmountOut.toString()}`);

    return NextResponse.json({
      dstAmount: bestAmountOut.toString(),
      gasCost: { value: "0" },
      priceImpact: "0",
      usedFee: usedFee,
    });
  } catch (error: any) {
    console.error("SERVER ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote", details: error.message },
      { status: 500 }
    );
  }
}
