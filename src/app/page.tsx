"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Info,
  ArrowRightLeft,
  Loader2,
  Sparkles,
  Settings,
  Droplets,
  BarChart2,
  Layers,
} from "lucide-react";

// [변경] 통합 API 사용
import { okxApi, CHAINS, TokenInfo, NATIVE_TOKEN_ADDRESS } from "@/lib/api";
import NativeChart from "@/components/dex/NativeChart";
import TokenSelector from "@/components/dex/TokenSelector";
import { toWei, fromWei } from "@/lib/utils";

// 로딩 중 UI 깨짐 방지용 더미 데이터
const PLACEHOLDER_TOKEN: TokenInfo = {
  chainId: 0,
  address: NATIVE_TOKEN_ADDRESS,
  name: "Loading...",
  symbol: "---",
  decimals: 18,
};

export default function Home() {
  // --- 상태 관리 ---
  const [chainId, setChainId] = useState(42161); // Default: Arbitrum
  const [tokens, setTokens] = useState<TokenInfo[]>([]);

  const [tokenA, setTokenA] = useState<TokenInfo | null>(null);
  const [tokenB, setTokenB] = useState<TokenInfo | null>(null);

  // 차트 상태
  const [chartData, setChartData] = useState<any[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [timeframe, setTimeframe] = useState("1D");

  // 스왑 상태
  const [amount, setAmount] = useState("");
  const [quoteData, setQuoteData] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market"); // UI 복구
  const [limitPrice, setLimitPrice] = useState(""); // UI 복구

  const [modalSource, setModalSource] = useState<
    "chart" | "pay" | "receive" | null
  >(null);

  // 1. 체인 변경 시 초기화
  useEffect(() => {
    const initChain = async () => {
      const list = await okxApi.getTokens(chainId);
      setTokens(list);

      if (list.length > 0) {
        const defaultA =
          list.find((t) => t.symbol === "ETH" || t.symbol === "WETH") ||
          list[0];
        const defaultB =
          list.find(
            (t) => t.symbol.includes("USD") && t.address !== defaultA.address
          ) || list[1];
        setTokenA(defaultA);
        setTokenB(defaultB);
      }
    };
    initChain();
  }, [chainId]);

  // 2. 차트 로드 (API 중복 호출 제거)
  useEffect(() => {
    if (!tokenA) return;
    const loadChart = async () => {
      setIsChartLoading(true);
      const candles = await okxApi.getCandles(
        chainId,
        tokenA.address,
        timeframe
      );
      const formatted = candles.map((c: any) => ({
        time: c.time,
        open: parseFloat(c.open),
        high: parseFloat(c.high),
        low: parseFloat(c.low),
        close: parseFloat(c.close),
      }));
      setChartData(formatted);
      setIsChartLoading(false);

      // Limit Price 초기값 설정 (UI 복구)
      if (tokenA.price && !limitPrice) {
        setLimitPrice(tokenA.price);
      }
    };
    loadChart();
  }, [tokenA, timeframe, chainId]);

  // 3. 스왑 견적 (실시간)
  useEffect(() => {
    if (!tokenA || !tokenB || !amount || parseFloat(amount) <= 0) {
      setQuoteData(null);
      return;
    }
    // Limit 주문이면 견적 요청 안 함 (데모용 로직)
    if (orderType === "limit") return;

    const fetchQuote = async () => {
      setQuoteLoading(true);
      const fromToken = activeTab === "buy" ? tokenB : tokenA;
      const toToken = activeTab === "buy" ? tokenA : tokenB;
      const weiAmount = toWei(amount, fromToken.decimals);

      const data = await okxApi.getQuote({
        chainId,
        tokenIn: fromToken.address,
        tokenOut: toToken.address,
        amount: weiAmount,
      });

      setQuoteData(data);
      setQuoteLoading(false);
    };

    const timer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timer);
  }, [amount, tokenA, tokenB, activeTab, chainId, orderType]);

  // --- 렌더링 변수 ---
  const displayTokenA = tokenA || PLACEHOLDER_TOKEN;
  const displayTokenB = tokenB || PLACEHOLDER_TOKEN;
  const currentPayToken = activeTab === "buy" ? displayTokenB : displayTokenA;
  const currentReceiveToken =
    activeTab === "buy" ? displayTokenA : displayTokenB;
  const currentChain = CHAINS.find((c) => c.id === chainId) || CHAINS[0];

  const currentPrice = displayTokenA.price
    ? parseFloat(displayTokenA.price)
    : 0;
  const change24h = displayTokenA.change24h
    ? parseFloat(displayTokenA.change24h)
    : 0;

  // Total Cost 계산 (UI 복구)
  const payTokenPrice = currentPayToken.price
    ? parseFloat(currentPayToken.price)
    : 0;
  const totalCostValue = amount ? parseFloat(amount) * payTokenPrice : 0;

  const handleSelectToken = (token: TokenInfo) => {
    if (modalSource === "chart") setTokenA(token);
    else if (modalSource === "pay")
      activeTab === "buy" ? setTokenB(token) : setTokenA(token);
    else if (modalSource === "receive")
      activeTab === "buy" ? setTokenA(token) : setTokenB(token);
    setModalSource(null);
  };

  return (
    <div className="container mx-auto p-4 lg:p-8 max-w-7xl min-h-screen flex flex-col gap-6">
      {/* 1. Header (기존 UI 유지) */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center px-2 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
            <img
              src={currentChain.logo}
              alt={currentChain.name}
              className="w-5 h-5 rounded-full"
            />
            <span className="text-sm font-bold text-gray-200">
              {currentChain.name}
            </span>
          </div>

          <button
            onClick={() => setModalSource("chart")}
            className="flex items-center gap-3 group outline-none"
          >
            {displayTokenA.logoURI ? (
              <img
                src={displayTokenA.logoURI}
                alt={displayTokenA.symbol}
                className="w-10 h-10 rounded-full bg-white/10 shadow-lg group-hover:scale-110 transition-transform"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
            )}
            <div className="text-left">
              <h1 className="text-3xl font-black flex items-center gap-2 text-white tracking-tight">
                {displayTokenA.symbol}
                <span className="text-gray-500 text-lg font-bold">/ USD</span>
                <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
              </h1>
            </div>
          </button>
        </div>

        <div className="text-right mt-4 md:mt-0">
          <div className="text-4xl font-black tabular-nums tracking-tight text-white">
            {currentPrice > 0 ? `$${currentPrice.toLocaleString()}` : "---"}
          </div>
          <div
            className={`text-sm font-bold flex justify-end items-center gap-1 ${
              change24h >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {change24h >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(change24h).toFixed(2)}% (24h)
          </div>
        </div>
      </div>

      {/* 2. Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* [Left] Chart Area */}
        <div className="lg:col-span-2 relative rounded-3xl overflow-hidden bg-white/5 border border-white/5 shadow-xl h-[650px] flex flex-col">
          {/* Chart Header */}
          <div className="flex justify-between items-start p-4 z-10">
            <div className="flex gap-4 text-xs font-medium text-gray-400">
              <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg border border-white/5">
                <Layers className="w-3 h-3 text-white" />
                <span>OKX Aggregator</span>
              </div>
              <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg border border-white/5">
                <Droplets className="w-3 h-3 text-blue-400" />
                <span>
                  Liq: $
                  {parseFloat(displayTokenA.liquidity || "0").toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg border border-white/5">
                <BarChart2 className="w-3 h-3 text-green-400" />
                <span>
                  Vol: $
                  {parseFloat(displayTokenA.volume24h || "0").toLocaleString()}
                </span>
              </div>
            </div>

            {/* Timeframes */}
            <div className="flex bg-black/30 rounded-lg p-1 border border-white/5 backdrop-blur-md">
              {["1H", "4H", "1D", "1W"].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    timeframe === tf
                      ? "bg-white/20 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Body - [수정] 타입 에러 원인 제거 (props 단순화) */}
          <div className="flex-1 relative w-full">
            {isChartLoading ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-black/20 backdrop-blur-sm z-10">
                <Loader2 className="animate-spin mr-2 w-5 h-5" /> Loading
                Chart...
              </div>
            ) : (
              <div className="w-full h-full pb-2">
                <NativeChart
                  data={chartData}
                  colors={{ textColor: "#737373" }}
                />
              </div>
            )}
          </div>
        </div>

        {/* [Right] Swap Panel (UI 완전 복구) */}
        <motion.div className="lg:col-span-1 glass-panel rounded-3xl p-6 flex flex-col relative overflow-hidden h-fit min-h-[600px]">
          <div
            className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-15 pointer-events-none transition-colors duration-500 ${
              activeTab === "buy" ? "bg-green-500" : "bg-red-500"
            }`}
          />

          {/* Tabs */}
          <div className="flex bg-black/20 p-1 rounded-xl mb-6 relative border border-white/5 h-12 shrink-0">
            {["buy", "sell"].map((mode) => (
              <button
                key={mode}
                onClick={() => setActiveTab(mode as any)}
                className={`flex-1 relative z-10 text-sm font-black uppercase transition-colors duration-200 ${
                  activeTab === mode
                    ? "text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {activeTab === mode && (
                  <motion.div
                    layoutId="active-tab-bg"
                    className={`absolute inset-0 rounded-lg ${
                      mode === "buy"
                        ? "bg-green-500/20 border border-green-500/30"
                        : "bg-red-500/20 border border-red-500/30"
                    }`}
                  />
                )}
                <span className="relative z-20">{mode}</span>
              </button>
            ))}
          </div>

          {/* Inputs */}
          <div className="flex flex-col gap-2 relative z-10">
            {/* YOU PAY (Limit/Market 탭 복구) */}
            <motion.div
              layout
              className={`input-well p-4 flex flex-col relative transition-colors hover:border-white/10 min-h-[170px] ${
                orderType === "market" ? "justify-center" : "justify-between"
              }`}
            >
              <div
                className={`flex justify-between text-xs font-bold text-gray-500 tracking-wide ${
                  orderType === "market" ? "mb-4" : ""
                }`}
              >
                <span>YOU PAY</span>
                <div className="flex gap-3">
                  <span
                    onClick={() => setOrderType("market")}
                    className={`cursor-pointer transition-colors ${
                      orderType === "market"
                        ? "text-white"
                        : "hover:text-gray-300"
                    }`}
                  >
                    Market
                  </span>
                  <span
                    onClick={() => setOrderType("limit")}
                    className={`cursor-pointer transition-colors ${
                      orderType === "limit"
                        ? "text-white"
                        : "hover:text-gray-300"
                    }`}
                  >
                    Limit
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center gap-2">
                <input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-transparent text-3xl font-bold text-white outline-none w-full placeholder-gray-700 tabular-nums"
                />
                <button
                  onClick={() => setModalSource("pay")}
                  className="bg-white/5 hover:bg-white/10 border border-white/5 px-3 py-1.5 rounded-full flex items-center gap-2 transition-all shrink-0"
                >
                  {currentPayToken.logoURI && (
                    <img
                      src={currentPayToken.logoURI}
                      alt=""
                      className="w-5 h-5 rounded-full"
                    />
                  )}
                  <span className="font-bold text-sm text-white">
                    {currentPayToken.symbol}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-50 text-white" />
                </button>
              </div>

              <AnimatePresence>
                {orderType === "limit" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 mt-2 border-t border-white/5 flex justify-between items-center">
                      <span className="text-xs text-blue-400 font-bold">
                        Target Price
                      </span>
                      <input
                        type="number"
                        placeholder={displayTokenA.price || "0"}
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        className="bg-transparent text-right text-sm font-bold outline-none text-white w-1/2"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Arrow */}
            <div className="flex justify-center -my-5 relative z-20 pointer-events-none">
              <div className="bg-[#1a1c23] border border-white/10 p-2 rounded-xl text-gray-400 shadow-xl">
                <ArrowRightLeft className="w-4 h-4 rotate-90 text-white" />
              </div>
            </div>

            {/* YOU RECEIVE */}
            <div className="input-well p-4 flex flex-col gap-3 pt-6 min-h-[110px] justify-center">
              <div className="text-xs font-bold text-gray-500 tracking-wide">
                YOU RECEIVE
              </div>
              <div className="flex justify-between items-center gap-2">
                <div className="text-3xl font-bold text-white tabular-nums truncate">
                  {quoteLoading ? (
                    <span className="text-gray-600 text-lg animate-pulse">
                      Calculating...
                    </span>
                  ) : quoteData ? (
                    parseFloat(
                      fromWei(quoteData.dstAmount, currentReceiveToken.decimals)
                    ).toLocaleString(undefined, { maximumFractionDigits: 6 })
                  ) : (
                    "0"
                  )}
                </div>
                <button
                  onClick={() => setModalSource("receive")}
                  className="bg-white/5 hover:bg-white/10 border border-white/5 px-3 py-1.5 rounded-full flex items-center gap-2 transition-all shrink-0"
                >
                  {currentReceiveToken.logoURI && (
                    <img
                      src={currentReceiveToken.logoURI}
                      alt=""
                      className="w-5 h-5 rounded-full"
                    />
                  )}
                  <span className="font-bold text-sm text-white">
                    {currentReceiveToken.symbol}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-50 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Info Section (상세 정보 복구) */}
          <div className="mt-6 flex flex-col gap-4 relative z-10 flex-1 justify-end border-t border-white/5 pt-4">
            <div className="px-2 space-y-3">
              <div className="flex justify-between text-xs text-gray-500 font-medium items-center">
                <span>Rate</span>
                <span className="text-gray-300">
                  1 {currentPayToken.symbol} ≈{" "}
                  {quoteData && amount
                    ? (
                        parseFloat(
                          fromWei(
                            quoteData.dstAmount,
                            currentReceiveToken.decimals
                          )
                        ) / parseFloat(amount)
                      ).toLocaleString()
                    : "-"}{" "}
                  {currentReceiveToken.symbol}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 font-medium items-center">
                <span>Price Impact</span>
                <span
                  className={`${
                    parseFloat(quoteData?.priceImpact || "0") > 5
                      ? "text-red-400"
                      : "text-green-400"
                  }`}
                >
                  {quoteData?.priceImpact
                    ? `${parseFloat(quoteData.priceImpact).toFixed(2)}%`
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 font-medium items-center">
                <span>Max Slippage</span>
                <button className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded text-gray-300 hover:text-white transition-colors">
                  Auto (0.5%) <Settings className="w-3 h-3" />
                </button>
              </div>
              <div className="flex justify-between text-xs text-gray-500 font-medium items-center">
                <span>Network Cost</span>
                <span className="text-blue-400 flex items-center gap-1 font-bold">
                  <Sparkles className="w-3 h-3" /> Gasless
                </span>
              </div>

              {/* Total Cost 복구 */}
              <div className="flex justify-between items-center pt-3 mt-1 border-t border-white/5">
                <span className="text-sm font-bold text-gray-400">
                  Total Cost
                </span>
                <div className="text-right">
                  <div className="text-xl font-black text-white tabular-nums">
                    $
                    {totalCostValue.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-[10px] text-gray-500 font-medium">
                    includes all fees
                  </div>
                </div>
              </div>
            </div>

            <button
              className={`w-full py-4 rounded-xl text-lg font-black flex justify-center items-center gap-2 shadow-lg active:scale-[0.98] transition-transform ${
                activeTab === "buy" ? "btn-buy" : "btn-sell"
              }`}
            >
              {activeTab === "buy" ? "BUY" : "SELL"} {displayTokenA.symbol}
            </button>
          </div>
        </motion.div>
      </div>

      <TokenSelector
        isOpen={!!modalSource}
        onClose={() => setModalSource(null)}
        onSelect={handleSelectToken}
        selectedToken={
          modalSource === "chart"
            ? displayTokenA
            : modalSource === "pay"
            ? currentPayToken
            : currentReceiveToken
        }
        selectedChainId={chainId}
        onSelectChain={setChainId}
      />
    </div>
  );
}
