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
  Settings,
  Droplets,
  BarChart2,
  Layers,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toWei, fromWei } from "@/lib/utils";
import {
  findBestPool,
  fetchOHLCV,
  TokenInfo,
  CHAINS,
  DEFAULT_TOKENS,
} from "@/lib/api";
import NativeChart from "@/components/dex/NativeChart";
import TokenSelector from "@/components/dex/TokenSelector";

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
  const [chainId, setChainId] = useState(42161);
  const [tokenA, setTokenA] = useState<TokenInfo>(DEFAULT_TOKENS[42161].A);
  const [tokenB, setTokenB] = useState<TokenInfo>(DEFAULT_TOKENS[42161].B);
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
    const handleOpenTokenSelector = () => setModalSource("pay");
    window.addEventListener("open-token-selector", handleOpenTokenSelector);
    return () =>
      window.removeEventListener(
        "open-token-selector",
        handleOpenTokenSelector
      );
  }, []);

  // [신규 추가] 체인 변경 시 해당 체인의 기본 토큰으로 리셋
  // 이 로직이 없으면 Arbitrum 주소로 Ethereum에서 풀을 찾게 되어 가격 오류(USDT $6) 발생
  useEffect(() => {
    const defaults = DEFAULT_TOKENS[chainId];
    if (defaults) {
      setTokenA(defaults.A);
      setTokenB(defaults.B);
    }
  }, [chainId]);

  // [수정됨] 차트 로딩 로직
  useEffect(() => {
    const loadChart = async () => {
      setIsChartLoading(true);
      // [중요] chainId를 두 번째 인자로 전달!
      const pool = await findBestPool(tokenA.address, chainId);

      if (pool) {
        setPoolInfo(pool);
        const candles = await fetchOHLCV(pool.pairAddress, timeframe, chainId);
        setChartData(candles);
        if (!limitPrice) setLimitPrice(parseFloat(pool.priceUsd).toString());
      } else {
        setPoolInfo(null);
        setChartData([]);
      }
      setIsChartLoading(false);
    };
    loadChart();
  }, [tokenA, timeframe, chainId]);

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
        `/api/quote?tokenIn=${fromToken.address}&tokenOut=${toToken.address}&amount=${weiAmount}&chainId=${chainId}`
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
    setAmount("");
  };

  const currentChain = CHAINS.find((c) => c.id === chainId) || CHAINS[0];

  return (
    <div className="container mx-auto p-4 lg:p-8 max-w-7xl min-h-screen flex flex-col gap-6">
      {/* 1. Header */}
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
            {tokenA.logoURI && (
              <img
                src={tokenA.logoURI}
                className="w-10 h-10 rounded-full bg-white/10 shadow-lg group-hover:scale-110 transition-transform"
              />
            )}
            <div className="text-left">
              <h1 className="text-3xl font-black flex items-center gap-2 text-white tracking-tight">
                {tokenA.symbol}
                <span className="text-gray-500 text-lg font-bold">/ USD</span>
                <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
              </h1>
            </div>
          </button>
        </div>
        <div className="text-right mt-4 md:mt-0">
          <div className="text-4xl font-black tabular-nums tracking-tight text-white drop-shadow-sm">
            ${poolInfo ? parseFloat(poolInfo.priceUsd).toLocaleString() : "---"}
          </div>
          <div
            className={`text-sm font-bold flex justify-end items-center gap-1 ${
              poolInfo?.priceChange.h24 >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {poolInfo?.priceChange.h24 >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {poolInfo?.priceChange.h24}% (24h)
          </div>
        </div>
      </div>

      {/* 2. Main Grid: Swap Panel의 높이 제한 해제 (items-start 사용) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* [Left] Chart Area */}
        <div className="lg:col-span-2 relative rounded-3xl overflow-hidden bg-white/5 border border-white/5 shadow-xl h-[650px] flex flex-col">
          <div className="flex justify-between items-start p-4 z-10">
            {poolInfo ? (
              <div className="flex gap-4 text-xs font-medium text-gray-400">
                <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg border border-white/5">
                  <Layers className="w-3 h-3 text-white" />
                  <span>{poolInfo.dexId}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg border border-white/5">
                  <Droplets className="w-3 h-3 text-blue-400" />
                  <span>
                    Liq: $
                    {parseFloat(poolInfo.liquidity?.usd || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg border border-white/5">
                  <BarChart2 className="w-3 h-3 text-green-400" />
                  <span>
                    Vol: $
                    {parseFloat(poolInfo.volume?.h24 || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-600">Loading Pool Info...</div>
            )}
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
          <div className="flex-1 relative w-full">
            {isChartLoading ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-medium">
                <Loader2 className="animate-spin mr-2 w-5 h-5" /> Loading
                Chart...
              </div>
            ) : chartData.length > 0 ? (
              <div className="w-full h-full pb-2">
                <NativeChart
                  data={chartData}
                  colors={{ textColor: "#737373" }}
                  activeTimeframe={timeframe}
                  onTimeframeChange={setTimeframe}
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                No Data Available
              </div>
            )}
          </div>
        </div>

        {/* [Right] Swap Panel: h-fit 및 min-h 사용으로 내용물에 맞게 늘어남 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 glass-panel rounded-3xl p-6 flex flex-col relative overflow-hidden h-fit min-h-[600px]"
        >
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
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-20">{mode}</span>
              </button>
            ))}
          </div>

          {/* Inputs */}
          <div className="flex flex-col gap-2 relative z-10">
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
                  className="bg-white/5 hover:bg-white/10 border border-white/5 px-3 py-1.5 rounded-full flex items-center gap-2 transition-all shrink-0 active:scale-95"
                >
                  {currentPayToken.logoURI && (
                    <img
                      src={currentPayToken.logoURI}
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
                        placeholder={poolInfo?.priceUsd}
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        className="bg-transparent text-right text-sm font-bold outline-none text-white w-1/2"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <div className="flex justify-center -my-5 relative z-20 pointer-events-none">
              <div className="bg-[#1a1c23] border border-white/10 p-2 rounded-xl text-gray-400 shadow-xl">
                <ArrowRightLeft className="w-4 h-4 rotate-90 text-white" />
              </div>
            </div>

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
                  className="bg-white/5 hover:bg-white/10 border border-white/5 px-3 py-1.5 rounded-full flex items-center gap-2 transition-all shrink-0 active:scale-95"
                >
                  {currentReceiveToken.logoURI && (
                    <img
                      src={currentReceiveToken.logoURI}
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

          {/* Info Section (항상 표시되도록 함) */}
          <div className="mt-6 flex flex-col gap-4 relative z-10 flex-1 justify-end border-t border-white/5 pt-4">
            <div className="px-2 space-y-3">
              {/* Rate */}
              <div className="flex justify-between text-xs text-gray-500 font-medium items-center">
                <span>Rate</span>
                <span className="text-gray-300">
                  1 {currentPayToken.symbol} ≈{" "}
                  {quoteData && amount && parseFloat(amount) > 0
                    ? (
                        parseFloat(
                          fromWei(
                            quoteData.dstAmount,
                            currentReceiveToken.decimals
                          )
                        ) / parseFloat(amount)
                      ).toLocaleString(undefined, { maximumFractionDigits: 4 })
                    : "-"}{" "}
                  {currentReceiveToken.symbol}
                </span>
              </div>

              {/* [수정] Route: DEX 이름 강제 표시 */}
              <div className="flex justify-between text-xs text-gray-500 font-medium items-center">
                <span className="flex items-center gap-1">
                  Route <Info className="w-3 h-3" />
                </span>
                <span className="text-gray-300 flex items-center gap-1">
                  {quoteData?.router ? (
                    <span className="text-[10px] bg-white/10 border border-white/5 px-1.5 py-0.5 rounded text-blue-300 font-bold">
                      Via {quoteData.router}
                    </span>
                  ) : (
                    /* 데이터 로딩 전이나 경로 없을 때 표시 */
                    <span className="text-xs text-gray-600 flex items-center gap-1">
                      Finding best route...
                    </span>
                  )}
                </span>
              </div>

              {/* Price Impact */}
              <div className="flex justify-between text-xs text-gray-500 font-medium items-center">
                <span>Price Impact</span>
                <span
                  className={`${
                    quoteData ? "text-green-400" : "text-gray-500"
                  }`}
                >
                  {quoteData?.priceImpact ? `${quoteData.priceImpact}%` : "-"}
                </span>
              </div>

              {/* Max Slippage */}
              <div className="flex justify-between text-xs text-gray-500 font-medium items-center">
                <span>Max Slippage</span>
                <button className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded text-gray-300 hover:text-white transition-colors">
                  Auto (0.5%) <Settings className="w-3 h-3" />
                </button>
              </div>

              {/* Network Cost */}
              <div className="flex justify-between text-xs text-gray-500 font-medium items-center">
                <span>Network Cost</span>
                <span className="text-blue-400 flex items-center gap-1 font-bold">
                  <Sparkles className="w-3 h-3" /> Free (Gasless)
                </span>
              </div>

              {/* Total Cost */}
              <div className="flex justify-between items-center pt-3 mt-1 border-t border-white/5">
                <span className="text-sm font-bold text-gray-400">
                  Total Cost
                </span>
                <div className="text-right">
                  <div className="text-xl font-black text-white tabular-nums">
                    $
                    {amount
                      ? (parseFloat(amount) * payTokenPrice).toLocaleString(
                          undefined,
                          { maximumFractionDigits: 2 }
                        )
                      : "0.00"}
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
              {activeTab === "buy" ? "BUY" : "SELL"} {tokenA.symbol}
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
            ? tokenA
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
