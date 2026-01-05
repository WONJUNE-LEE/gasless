"use client";

import {
  ArrowRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Info,
  ArrowRightLeft,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toWei, fromWei } from "@/lib/utils";
import { fetchTokenList, findBestPool, fetchOHLCV, TokenInfo } from "@/lib/api";
import NativeChart from "@/components/dex/NativeChart";
import TokenSelector from "@/components/dex/TokenSelector";
import GlassTabs from "@/components/dex/GlassTabs";

const DEFAULT_TOKEN_A: TokenInfo = {
  chainId: 42161,
  address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  name: "Wrapped Ether",
  symbol: "WETH",
  decimals: 18,
  logoURI: "https://assets.coingecko.com/coins/images/2518/thumb/weth.png",
};
const DEFAULT_TOKEN_B: TokenInfo = {
  chainId: 42161,
  address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
  name: "Tether USD",
  symbol: "USDT",
  decimals: 6,
  logoURI: "https://assets.coingecko.com/coins/images/325/thumb/Tether.png",
};

export default function Home() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tokenA, setTokenA] = useState<TokenInfo>(DEFAULT_TOKEN_A);
  const [tokenB, setTokenB] = useState<TokenInfo>(DEFAULT_TOKEN_B);
  const [modalSource, setModalSource] = useState<
    "chart" | "pay" | "receive" | null
  >(null);

  const [chartData, setChartData] = useState<any[]>([]);
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [timeframe, setTimeframe] = useState("1D");

  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [quoteData, setQuoteData] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  useEffect(() => {
    fetchTokenList().then(setTokens);
    const handleOpenTokenSelector = () => {
      setModalSource("pay");
      setSearchQuery("");
    };
    window.addEventListener("open-token-selector", handleOpenTokenSelector);
    return () =>
      window.removeEventListener(
        "open-token-selector",
        handleOpenTokenSelector
      );
  }, []);

  useEffect(() => {
    const loadChart = async () => {
      setIsChartLoading(true);
      const pool = await findBestPool(tokenA.address);
      if (pool) {
        setPoolInfo(pool);
        const candles = await fetchOHLCV(pool.pairAddress, timeframe);
        setChartData(candles);
        if (!limitPrice) setLimitPrice(parseFloat(pool.priceUsd).toString());
      } else {
        setPoolInfo(null);
        setChartData([]);
      }
      setIsChartLoading(false);
    };
    loadChart();
  }, [tokenA, timeframe]);

  useEffect(() => {
    setQuoteData(null);
    const timer = setTimeout(() => {
      if (orderType === "market" && amount && parseFloat(amount) > 0)
        fetchQuote();
    }, 600);
    return () => clearTimeout(timer);
  }, [amount, activeTab, tokenA, tokenB, orderType]);

  const fetchQuote = async () => {
    setQuoteLoading(true);
    try {
      const fromToken = activeTab === "buy" ? tokenB : tokenA;
      const toToken = activeTab === "buy" ? tokenA : tokenB;
      const weiAmount = toWei(amount, fromToken.decimals);
      const res = await fetch(
        `/api/quote?tokenIn=${fromToken.address}&tokenOut=${toToken.address}&amount=${weiAmount}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuoteData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setQuoteLoading(false);
    }
  };

  const currentPayToken = activeTab === "buy" ? tokenB : tokenA;
  const currentReceiveToken = activeTab === "buy" ? tokenA : tokenB;

  const payTokenPrice =
    currentPayToken.symbol === "USDT" || currentPayToken.symbol === "USDC"
      ? 1
      : poolInfo
      ? parseFloat(poolInfo.priceUsd)
      : 0;

  const handleSelectToken = (token: TokenInfo) => {
    if (modalSource === "chart") setTokenA(token);
    else if (modalSource === "pay")
      activeTab === "buy" ? setTokenB(token) : setTokenA(token);
    else if (modalSource === "receive")
      activeTab === "buy" ? setTokenA(token) : setTokenB(token);
    setModalSource(null);
    setSearchQuery("");
    setAmount("");
  };

  const filteredTokens = tokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4 lg:p-6 max-w-7xl min-h-screen flex flex-col gap-2 font-sans relative">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center px-4 py-2 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setModalSource("chart")}
            className="flex items-center gap-4 group outline-none"
          >
            <div className="relative">
              {tokenA.logoURI ? (
                <img
                  src={tokenA.logoURI}
                  alt={tokenA.symbol}
                  className="h-12 w-12 rounded-full shadow-md group-hover:scale-105 transition-transform bg-white"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {tokenA.symbol[0]}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-zinc-800 rounded-full p-0.5 shadow-sm">
                <ChevronDown className="w-3 h-3 text-gray-500" />
              </div>
            </div>

            <div className="text-left">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-2 text-black dark:text-white">
                {tokenA.name}
                <span className="text-lg font-bold text-gray-400 dark:text-gray-500 hidden md:inline">
                  {tokenA.symbol}
                </span>
              </h1>
              <div className="flex items-center gap-2 text-sm font-semibold mt-1">
                <span className="text-gray-500">Price</span>
                <span
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                    poolInfo?.priceChange.h24 >= 0
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {poolInfo?.priceChange.h24}% (24h)
                </span>
              </div>
            </div>
          </button>
        </div>

        <div className="text-right mt-4 md:mt-0">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">
              Uniswap V3
            </span>
            <motion.p
              key={poolInfo?.priceUsd}
              initial={{ scale: 1.1 }}
              animate={{
                scale: 1,
                color:
                  poolInfo?.priceChange.h24 >= 0
                    ? "var(--color-up)"
                    : "var(--color-down)",
              }}
              className="text-4xl md:text-5xl font-black tabular-nums tracking-tighter"
            >
              $
              {poolInfo
                ? parseFloat(poolInfo.priceUsd).toLocaleString()
                : "---"}
            </motion.p>
          </div>
        </div>
      </div>

      {/* 2. Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[650px]">
        {/* [왼쪽] 차트 영역: relative 적용 (배경 없음, 차트만 떠있는 느낌) */}
        <div className="lg:col-span-2 flex flex-col h-[500px] lg:h-full relative overflow-hidden">
          {isChartLoading ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 gap-2">
              <Loader2 className="animate-spin" /> Loading...
            </div>
          ) : chartData.length > 0 ? (
            <div className="flex-1 w-full h-full pt-4">
              <NativeChart
                data={chartData}
                colors={{ textColor: "#9ca3af" }}
                activeTimeframe={timeframe}
                onTimeframeChange={setTimeframe}
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              No Data
            </div>
          )}
        </div>

        {/* [오른쪽] 스왑 패널: glass-panel 적용 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1 h-full rounded-[2rem] glass-panel p-5 flex flex-col relative overflow-hidden"
        >
          {/* 오로라 배경 (은은하게) */}
          <div
            className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-30 pointer-events-none transition-colors duration-500 ${
              activeTab === "buy" ? "bg-green-400" : "bg-red-400"
            }`}
          />

          {/* 1. Buy/Sell 탭 */}
          <div className="mb-3 shrink-0">
            <GlassTabs
              layoutId="trade-tab"
              tabs={[
                {
                  id: "buy",
                  label: "Buy",
                  icon: <TrendingUp className="w-4 h-4" />,
                },
                {
                  id: "sell",
                  label: "Sell",
                  icon: <TrendingDown className="w-4 h-4" />,
                },
              ]}
              activeTab={activeTab}
              onChange={(id) => {
                setActiveTab(id);
                setAmount("");
                setQuoteData(null);
              }}
            />
          </div>

          {/* 2. 입력 폼 영역 */}
          <div className="flex-1 flex flex-col justify-start gap-2">
            {/* Pay Input */}
            <div
              className={`glass-input rounded-[1.5rem] px-5 py-4 focus-within:ring-2 ring-blue-500/20 transition-all relative flex flex-col ${
                orderType === "limit" ? "gap-1" : "gap-0"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                  Pay with
                </span>
                <div className="flex gap-1 bg-black/5 dark:bg-white/5 rounded-lg p-1">
                  {["market", "limit"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setOrderType(type as any)}
                      className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${
                        orderType === type
                          ? "bg-white dark:bg-gray-600 shadow-sm text-black dark:text-white"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-3xl font-bold outline-none tabular-nums placeholder-gray-300 dark:placeholder-zinc-600"
                />
                <button
                  onClick={() => setModalSource("pay")}
                  className="glass-btn flex items-center gap-2 pl-2 pr-4 py-2 rounded-full shrink-0"
                >
                  {currentPayToken.logoURI && (
                    <img
                      src={currentPayToken.logoURI}
                      className="w-6 h-6 rounded-full bg-white"
                    />
                  )}
                  <span className="font-bold text-sm">
                    {currentPayToken.symbol}
                  </span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>
              </div>

              {/* 지정가 입력 */}
              <AnimatePresence>
                {orderType === "limit" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 8 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    className="overflow-hidden border-t border-black/5 dark:border-white/5 pt-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-blue-500 font-bold uppercase">
                        Target Price
                      </span>
                      <input
                        type="number"
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        placeholder={poolInfo?.priceUsd}
                        className="bg-transparent text-right font-bold text-lg outline-none w-1/2"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 화살표 */}
            <div className="flex justify-center -my-3 relative z-10">
              <div className="glass-btn p-2 rounded-xl">
                <ArrowRightLeft className="w-3 h-3 text-gray-500 rotate-90" />
              </div>
            </div>

            {/* Receive Input */}
            <div className="glass-input rounded-[1.5rem] px-5 py-4">
              <div className="flex justify-between text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                <span>Receive (Est.)</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                {quoteLoading ? (
                  <div className="h-9 flex items-center gap-2 text-gray-400 text-sm">
                    <Loader2 className="animate-spin w-4 h-4" /> Calculating...
                  </div>
                ) : (
                  <input
                    type="text"
                    readOnly
                    value={
                      quoteData
                        ? fromWei(
                            quoteData.dstAmount,
                            currentReceiveToken.decimals
                          )
                        : "0"
                    }
                    className={`w-full bg-transparent text-3xl font-bold outline-none tabular-nums ${
                      quoteData ? "text-black dark:text-white" : "text-gray-300"
                    }`}
                  />
                )}
                <div
                  className="glass-btn flex items-center gap-2 pl-2 pr-4 py-2 rounded-full shrink-0 cursor-pointer hover:opacity-80"
                  onClick={() => setModalSource("receive")}
                >
                  {currentReceiveToken.logoURI && (
                    <img
                      src={currentReceiveToken.logoURI}
                      className="w-5 h-5 rounded-full bg-white"
                    />
                  )}
                  <span className="font-bold text-sm">
                    {currentReceiveToken.symbol}
                  </span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* 3. 상세 정보 */}
          <div className="mt-3 mb-3 space-y-2 px-1 shrink-0 text-xs font-medium text-gray-500">
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                Route <Info className="w-3 h-3" />
              </span>
              <span className="text-black dark:text-white flex items-center gap-1 font-semibold">
                {currentPayToken.symbol}{" "}
                <ArrowRight className="w-3 h-3 text-gray-400" />{" "}
                {currentReceiveToken.symbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Price Impact</span>
              <span className="text-green-500 font-bold">
                {quoteData ? "~0.05%" : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Network Fee</span>
              <span className="text-blue-500 font-bold flex items-center gap-1">
                Free <Sparkles className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* 4. 구매 버튼 (Solid Gradient, not glass-btn) */}
          <div className="mt-auto shrink-0">
            {/* Total Spend */}
            <div className="flex justify-between items-end mb-2 px-1">
              <span className="text-sm font-bold text-gray-500">
                Total Spend
              </span>
              <div className="text-right">
                <div className="text-lg font-black tracking-tight tabular-nums">
                  $
                  {amount
                    ? (parseFloat(amount) * payTokenPrice).toLocaleString(
                        undefined,
                        {
                          maximumFractionDigits: 2,
                        }
                      )
                    : "0.00"}
                </div>
                {amount && (
                  <div className="text-[10px] text-gray-400 font-semibold">
                    {amount} {currentPayToken.symbol} × $
                    {payTokenPrice.toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* 버튼: 불투명도 제거 (/90 -> solid) 및 glass-btn 제거 */}
            <button
              className={`w-full py-4 rounded-[1.2rem] text-xl font-bold text-white shadow-xl transition-all active:scale-[0.98] relative overflow-hidden group border border-white/20 ${
                activeTab === "buy"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500"
                  : "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500"
              }`}
            >
              {/* 상단 빛 반사 효과 */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 blur-md" />

              <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-md">
                {activeTab === "buy" ? "Buy" : "Sell"} {tokenA.symbol}
              </span>
            </button>
          </div>
        </motion.div>
      </div>

      <TokenSelector
        isOpen={!!modalSource}
        onClose={() => setModalSource(null)}
        tokens={filteredTokens}
        onSelect={handleSelectToken}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedToken={
          modalSource === "chart"
            ? tokenA
            : modalSource === "pay"
            ? currentPayToken
            : modalSource === "receive"
            ? currentReceiveToken
            : undefined
        }
      />
    </div>
  );
}
