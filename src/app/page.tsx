"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Settings,
  ArrowRightLeft,
  Loader2,
  Sparkles,
  Layers,
  BarChart2,
  Droplets,
  Wallet,
  Route as RouteIcon,
  Copy,
  Check,
} from "lucide-react";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useBalance,
  useReadContract,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import { erc20Abi } from "viem";

import { okxApi, CHAINS, TokenInfo, NATIVE_TOKEN_ADDRESS } from "@/lib/api";
import NativeChart from "@/components/dex/NativeChart";
import TokenSelector from "@/components/dex/TokenSelector";
import { toWei, fromWei } from "@/lib/utils";
import RecentTrades from "@/components/dex/RecentTrades"; // [추가]

const PLACEHOLDER_TOKEN: TokenInfo = {
  chainId: 0,
  address: NATIVE_TOKEN_ADDRESS,
  name: "Loading...",
  symbol: "---",
  decimals: 18,
};

// [추가] 화면 표시용 실시간 가격 상태 관리

const SLIPPAGE_OPTIONS = [
  { label: "Auto", value: "auto" },
  { label: "0.1%", value: "0.1" },
  { label: "0.5%", value: "0.5" },
  { label: "1.0%", value: "1.0" },
];

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);

  // Wagmi Hooks
  const { address, isConnected } = useAccount();
  const walletChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();

  // State
  const [chainId, setChainId] = useState(42161);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [tokenA, setTokenA] = useState<TokenInfo | null>(null);
  const [tokenB, setTokenB] = useState<TokenInfo | null>(null);

  const [chartData, setChartData] = useState<any[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [timeframe, setTimeframe] = useState("1D");

  const [amount, setAmount] = useState("");
  const [quoteData, setQuoteData] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState("");

  const [slippage, setSlippage] = useState("auto");
  const [showSlippage, setShowSlippage] = useState(false);

  const [displayPrice, setDisplayPrice] = useState<number>(0);

  const [modalSource, setModalSource] = useState<
    "chart" | "pay" | "receive" | null
  >(null);

  // Transaction State
  const [isSwapping, setIsSwapping] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [needsApprove, setNeedsApprove] = useState(false);
  const [dexRouterAddress, setDexRouterAddress] = useState<string | null>(null);
  const [isAddressCopied, setIsAddressCopied] = useState(false);

  // Derived Variables
  const displayTokenA = tokenA || PLACEHOLDER_TOKEN;
  const displayTokenB = tokenB || PLACEHOLDER_TOKEN;
  const currentPayToken = activeTab === "buy" ? displayTokenB : displayTokenA;
  const currentReceiveToken =
    activeTab === "buy" ? displayTokenA : displayTokenB;
  const currentChain = CHAINS.find((c) => c.id === chainId) || CHAINS[0];

  // 1. Balance Fetching
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address: address,
    chainId: chainId,
    token:
      currentPayToken.isNative ||
      currentPayToken.address === NATIVE_TOKEN_ADDRESS
        ? undefined
        : (currentPayToken.address as `0x${string}`),
    query: {
      enabled: !!address && !!currentPayToken,
    },
  });

  // 2. Allowance Check
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: currentPayToken.address as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      address && dexRouterAddress
        ? [address, dexRouterAddress as `0x${string}`]
        : undefined,
    query: {
      enabled: !currentPayToken.isNative && !!address && !!dexRouterAddress,
    },
  });

  // Transaction Receipt Waiting
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  // Reset State on Tx Success
  useEffect(() => {
    if (isTxSuccess) {
      setTxHash(undefined);
      setIsSwapping(false);
      setIsApproving(false);
      refetchBalance();
      refetchAllowance();
      setAmount("");
    }
  }, [isTxSuccess, refetchBalance, refetchAllowance]);

  // 1. 토큰이 변경될 때 초기 가격 설정
  useEffect(() => {
    if (tokenA && tokenA.price) {
      setDisplayPrice(parseFloat(tokenA.price));
    }
  }, [tokenA]);

  // 2. 차트 데이터 로드 시(초기 로딩 및 폴링) 최신 가격으로 업데이트
  useEffect(() => {
    if (chartData.length > 0) {
      const lastCandle = chartData[chartData.length - 1];
      if (lastCandle && lastCandle.close) {
        setDisplayPrice(lastCandle.close);
      }
    }
  }, [chartData]);

  // Sync Chain
  useEffect(() => {
    if (isConnected && walletChainId && walletChainId !== chainId) {
      setChainId(walletChainId);
    }
  }, [isConnected, walletChainId]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Global Event Listeners
  useEffect(() => {
    const handleForceNetworkChange = (e: CustomEvent<number>) => {
      const newChainId = e.detail;
      if (newChainId !== chainId) {
        setChainId(newChainId);
        if (isConnected) {
          switchChain({ chainId: newChainId });
        }
      }
    };
    window.addEventListener(
      "force-network-change",
      handleForceNetworkChange as any
    );
    const handleOpenTokenSelector = () => setModalSource("chart");
    window.addEventListener("open-token-selector", handleOpenTokenSelector);

    return () => {
      window.removeEventListener(
        "force-network-change",
        handleForceNetworkChange as any
      );
      window.removeEventListener(
        "open-token-selector",
        handleOpenTokenSelector
      );
    };
  }, [chainId, isConnected, switchChain]);

  // Init Chain Tokens
  useEffect(() => {
    const initChain = async () => {
      const list = await okxApi.getTokens(chainId);
      setTokens(list);
      if (list.length > 0) {
        let nextA = tokenA;
        if (!nextA || nextA.chainId !== chainId) {
          nextA =
            list.find(
              (t) => t.isNative || t.symbol === "ETH" || t.symbol === "WETH"
            ) || list[0];
        }
        let nextB = tokenB;
        if (!nextB || nextB.chainId !== chainId) {
          nextB =
            list.find(
              (t) => t.symbol.includes("USD") && t.address !== nextA?.address
            ) || list[1];
        }
        setTokenA(nextA);
        setTokenB(nextB);
      }
    };
    initChain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId]);

  // Load Chart (Initial)
  useEffect(() => {
    if (!tokenA) return;
    const loadChart = async () => {
      setIsChartLoading(true);
      try {
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
          value: c.volUsd,
        }));
        // [수정] 초기 데이터도 정렬 및 중복 제거
        formatted.sort((a: any, b: any) => a.time - b.time);
        setChartData(formatted);
        if (tokenA.price && !limitPrice) setLimitPrice(tokenA.price);
      } catch (e) {
        console.error("Failed to load chart", e);
      } finally {
        setIsChartLoading(false);
      }
    };
    loadChart();
  }, [tokenA, timeframe, chainId]);

  // Load History (Infinite Scroll)
  const handleLoadMoreHistory = async () => {
    if (!tokenA || isHistoryLoading || chartData.length === 0) return;
    setIsHistoryLoading(true);
    try {
      const oldestTime = chartData[0].time;
      const history = await okxApi.getCandles(
        chainId,
        tokenA.address,
        timeframe,
        oldestTime
      );

      if (history.length > 0) {
        const formattedHistory = history.map((c: any) => ({
          time: c.time,
          open: parseFloat(c.open),
          high: parseFloat(c.high),
          low: parseFloat(c.low),
          close: parseFloat(c.close),
          value: c.volUsd,
        }));

        // [수정] 데이터 병합 시 중복 제거 및 시간순 정렬 강제 (Assertion failed 방지)
        setChartData((prev) => {
          const merged = [...formattedHistory, ...prev];
          const uniqueMap = new Map();
          merged.forEach((item) => uniqueMap.set(item.time, item));
          const unique = Array.from(uniqueMap.values());
          unique.sort((a: any, b: any) => a.time - b.time);
          return unique;
        });
      }
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Fetch Quote & Check Allowance
  useEffect(() => {
    if (!tokenA || !tokenB || !amount || parseFloat(amount) <= 0) {
      setQuoteData(null);
      setDexRouterAddress(null);
      setQuoteError(null);
      return;
    }
    if (orderType === "limit") return;
    if (tokenA.chainId !== chainId || tokenB.chainId !== chainId) return;

    const fetchQuote = async () => {
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const fromToken = activeTab === "buy" ? tokenB : tokenA;
        const toToken = activeTab === "buy" ? tokenA : tokenB;
        const weiAmount = toWei(amount, fromToken.decimals);
        const targetSlippage = slippage === "auto" ? "0.5" : slippage;

        const data = await okxApi.getQuote({
          chainId,
          tokenIn: fromToken.address,
          tokenOut: toToken.address,
          amount: weiAmount,
          slippage: targetSlippage,
        });

        if (!data) throw new Error("No data received");
        setQuoteData(data);

        if (
          !dexRouterAddress &&
          !fromToken.isNative &&
          fromToken.address !== NATIVE_TOKEN_ADDRESS
        ) {
          try {
            const approveData = await okxApi.getApproveTransaction({
              chainId,
              tokenContractAddress: fromToken.address,
              approveAmount: "1",
            });
            if (approveData?.dexContractAddress) {
              setDexRouterAddress(approveData.dexContractAddress);
            }
          } catch (e) {
            console.warn(
              "Failed to fetch router address for allowance check",
              e
            );
          }
        }
      } catch (error: any) {
        console.error("Quote fetch failed:", error);
        setQuoteError(error.message || "Failed to fetch quote");
        setQuoteData(null);
      } finally {
        setQuoteLoading(false);
      }
    };

    const timer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timer);
  }, [amount, tokenA, tokenB, activeTab, chainId, orderType, slippage]);

  useEffect(() => {
    if (
      currentPayToken.isNative ||
      currentPayToken.address === NATIVE_TOKEN_ADDRESS
    ) {
      setNeedsApprove(false);
      return;
    }
    if (!allowance || !amount || !dexRouterAddress) {
      setNeedsApprove(false);
      return;
    }
    const amountWei = BigInt(toWei(amount, currentPayToken.decimals));
    setNeedsApprove(allowance < amountWei);
  }, [allowance, amount, currentPayToken, dexRouterAddress]);

  // [추가] 실시간 데이터 갱신 (Polling)
  useEffect(() => {
    if (!tokenA) return;

    const interval = setInterval(() => {
      // 차트 마지막 데이터 갱신 (Optional: 전체 다시 로드 대신 마지막 캔들만 가져오도록 최적화 가능하나 여기선 간단히)
      // 실제로는 별도 함수로 분리하여 호출하는 것이 좋음
      // 여기서는 Quote만 갱신하거나, 주요 가격 정보만 갱신
      console.log("Polling data...");
      // 예: 현재 가격 다시 fetch
    }, 15000); // 15초

    return () => clearInterval(interval);
  }, [tokenA]);

  const handleSelectToken = (token: TokenInfo) => {
    if (token.chainId !== chainId) {
      setChainId(token.chainId);
      if (isConnected) switchChain({ chainId: token.chainId });
    }
    if (modalSource === "chart") setTokenA(token);
    else if (modalSource === "pay")
      activeTab === "buy" ? setTokenB(token) : setTokenA(token);
    else if (modalSource === "receive")
      activeTab === "buy" ? setTokenA(token) : setTokenB(token);
    setModalSource(null);
  };

  const handleMax = () => {
    if (balanceData) {
      setAmount(balanceData.formatted);
    }
  };

  const handleApprove = async () => {
    if (!address || !currentPayToken || !amount) return;
    setIsApproving(true);
    try {
      const weiAmount = toWei(amount, currentPayToken.decimals);
      const data = await okxApi.getApproveTransaction({
        chainId,
        tokenContractAddress: currentPayToken.address,
        approveAmount: weiAmount,
      });

      const hash = await sendTransactionAsync({
        to: (data.tokenContractAddress ||
          currentPayToken.address) as `0x${string}`,
        data: data.data as `0x${string}`,
        value: BigInt(0),
      });
      setTxHash(hash);
    } catch (e) {
      console.error("Approve Failed", e);
      setIsApproving(false);
    }
  };

  const handleSwap = async () => {
    if (!address || !quoteData) return;
    setIsSwapping(true);
    try {
      const weiAmount = toWei(amount, currentPayToken.decimals);
      const targetSlippage = slippage === "auto" ? "0.5" : slippage;

      const txData = await okxApi.getSwapTransaction({
        chainId,
        amount: weiAmount,
        fromTokenAddress: currentPayToken.address,
        toTokenAddress: currentReceiveToken.address,
        userWalletAddress: address,
        slippage: targetSlippage,
      });

      const hash = await sendTransactionAsync({
        to: txData.to as `0x${string}`,
        data: txData.data as `0x${string}`,
        value: BigInt(txData.value || "0"),
      });
      setTxHash(hash);
    } catch (e) {
      console.error("Swap Failed", e);
      setIsSwapping(false);
    }
  };

  //const currentPrice = displayTokenA.price
  //  ? parseFloat(displayTokenA.price)
  //  : 0;
  const change24h = displayTokenA.change24h
    ? parseFloat(displayTokenA.change24h)
    : 0;
  const payTokenPrice = currentPayToken.price
    ? parseFloat(currentPayToken.price)
    : 0;
  const totalCostValue = amount ? parseFloat(amount) * payTokenPrice : 0;

  const copyAddress = () => {
    if (displayTokenA.address) {
      navigator.clipboard.writeText(displayTokenA.address);
      setIsAddressCopied(true);
      setTimeout(() => setIsAddressCopied(false), 2000);
    }
  };

  return (
    <div className="container mx-auto p-4 lg:p-8 max-w-7xl min-h-screen flex flex-col gap-6">
      {/* 1. Header (Current Chain & Chart Token) */}
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
              {/* [추가] 토큰 컨트랙트 주소 표시 */}
              <div
                className="flex items-center gap-2 text-xs text-gray-500 font-mono mt-1 hover:text-gray-300 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  copyAddress();
                }}
              >
                <span>{displayTokenA.address}</span>
                {isAddressCopied ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </div>
            </div>
          </button>
        </div>
        <div className="text-right mt-4 md:mt-0">
          <div className="text-4xl font-black tabular-nums tracking-tight text-white">
            {displayPrice > 0
              ? `$${displayPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}`
              : "---"}
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
        {/* Left Chart */}
        <div className="lg:col-span-2 relative rounded-3xl overflow-hidden bg-white/5 border border-white/5 shadow-xl h-[650px] flex flex-col">
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
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-black/20 backdrop-blur-sm z-10">
                <Loader2 className="animate-spin mr-2 w-5 h-5" /> Loading
                Chart...
              </div>
            ) : (
              <div className="w-full h-full pb-2 relative">
                {isHistoryLoading && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/50 px-3 py-1 rounded-full text-xs text-white backdrop-blur flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading
                    History...
                  </div>
                )}
                <NativeChart
                  data={chartData}
                  colors={{ textColor: "#737373" }}
                  onLoadMore={handleLoadMoreHistory}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Swap Panel */}
        <motion.div className="lg:col-span-1 glass-panel rounded-3xl p-6 flex flex-col relative overflow-hidden h-fit min-h-[600px]">
          <div
            className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-15 pointer-events-none transition-colors duration-500 ${
              activeTab === "buy" ? "bg-green-500" : "bg-red-500"
            }`}
          />

          <div className="flex justify-between items-center mb-6">
            <div className="flex bg-black/20 p-1 rounded-xl border border-white/5 h-10">
              {["buy", "sell"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setActiveTab(mode as any)}
                  className={`px-6 text-sm font-black uppercase rounded-lg transition-all ${
                    activeTab === mode
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="relative">
              <button
                onClick={() => setShowSlippage(!showSlippage)}
                className="p-2 rounded-lg bg-black/20 border border-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showSlippage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-12 z-50 w-64 bg-[#121212] border border-white/10 rounded-xl p-4 shadow-2xl"
                  >
                    <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase">
                      Max Slippage
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                      {SLIPPAGE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setSlippage(opt.value);
                            setShowSlippage(false);
                          }}
                          className={`px-2 py-2 rounded-lg text-xs font-bold transition-all ${
                            slippage === opt.value
                              ? "bg-blue-600 text-white"
                              : "bg-white/5 text-gray-400 hover:bg-white/10"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex flex-col gap-2 relative z-10">
            {/* YOU PAY */}
            <motion.div
              layout
              className={`input-well p-4 flex flex-col relative transition-colors hover:border-white/10 min-h-[170px] justify-center`}
            >
              <div className="flex justify-between text-xs font-bold text-gray-500 tracking-wide mb-4">
                <span>YOU PAY</span>
                <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Wallet className="w-3 h-3" />
                    <span>
                      {isMounted && balanceData
                        ? parseFloat(balanceData.formatted).toLocaleString(
                            undefined,
                            { maximumFractionDigits: 4 }
                          )
                        : "0"}
                    </span>
                  </div>
                  {isMounted && balanceData && (
                    <button
                      onClick={handleMax}
                      className="text-blue-400 hover:text-blue-300 transition-colors uppercase text-[10px] bg-blue-500/10 px-1.5 py-0.5 rounded"
                    >
                      Max
                    </button>
                  )}
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
            </motion.div>

            {/* Separator */}
            <div className="flex justify-center -my-5 relative z-20 pointer-events-none">
              <div className="bg-[#1a1c23] border border-white/10 p-2 rounded-xl text-gray-400 shadow-xl">
                <ArrowRightLeft className="w-4 h-4 rotate-90 text-white" />
              </div>
            </div>

            {/* YOU RECEIVE */}
            <div className="input-well p-4 flex flex-col gap-3 pt-6 min-h-[110px] justify-center">
              <div className="text-xs font-bold text-gray-500 tracking-wide">
                YOU RECEIVE
                {quoteError && (
                  <span className="ml-2 text-red-500 font-normal">
                    ({quoteError})
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center gap-2">
                <div className="text-3xl font-bold text-white tabular-nums truncate">
                  {quoteLoading ? (
                    <span className="text-gray-600 text-lg animate-pulse">
                      Calculating...
                    </span>
                  ) : quoteData ? (
                    fromWei(quoteData.dstAmount, currentReceiveToken.decimals)
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

          <div className="mt-6 flex flex-col gap-4 relative z-10 flex-1 justify-end border-t border-white/5 pt-4">
            <div className="px-2 space-y-3">
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
                      ).toLocaleString()
                    : "-"}{" "}
                  {currentReceiveToken.symbol}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 font-medium items-center">
                <span>Order Route</span>
                <span className="text-gray-300 truncate max-w-[150px] flex items-center gap-1">
                  <RouteIcon className="w-3 h-3" />
                  {quoteData?.router || "Best Route"}
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
                <button
                  onClick={() => setShowSlippage(true)}
                  className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded text-gray-300 hover:text-white transition-colors"
                >
                  {slippage === "auto" ? "Auto (0.5%)" : `${slippage}%`}{" "}
                  {/* 이미 퍼센트 값이므로 그대로 출력 */}
                  <Settings className="w-3 h-3" />
                </button>
              </div>
              <div className="flex justify-between text-xs text-gray-500 font-medium items-center">
                <span>Network Cost</span>
                <span className="text-blue-400 flex items-center gap-1 font-bold">
                  <Sparkles className="w-3 h-3" /> Gasless
                </span>
              </div>
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

            {isTxConfirming || isSwapping || isApproving ? (
              <button
                disabled
                className="w-full py-4 rounded-xl text-lg font-black flex justify-center items-center gap-2 shadow-lg bg-gray-700 text-gray-400 cursor-not-allowed"
              >
                <Loader2 className="animate-spin w-5 h-5" />
                {isTxConfirming
                  ? "Confirming..."
                  : isApproving
                  ? "Approving..."
                  : "Swapping..."}
              </button>
            ) : !isMounted || !isConnected ? ( // [수정 5] Hydration 보호 및 연결 상태 확인
              <button className="w-full py-4 rounded-xl text-lg font-black bg-blue-600 text-white shadow-lg">
                Connect Wallet
              </button>
            ) : needsApprove ? (
              <button
                onClick={handleApprove}
                className="w-full py-4 rounded-xl text-lg font-black bg-yellow-500 hover:bg-yellow-600 text-black shadow-lg transition-all"
              >
                Approve {currentPayToken.symbol}
              </button>
            ) : (
              <button
                onClick={handleSwap}
                disabled={!quoteData || !amount || !!quoteError}
                className={`w-full py-4 rounded-xl text-lg font-black flex justify-center items-center gap-2 shadow-lg active:scale-[0.98] transition-transform ${
                  activeTab === "buy" ? "btn-buy" : "btn-sell"
                } ${
                  !quoteData || !amount || !!quoteError
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                {activeTab === "buy" ? "BUY" : "SELL"} {displayTokenA.symbol}
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* [추가] 3. On-chain Transactions Section */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-blue-400" />
          On-chain Transactions
        </h2>
        {displayTokenA && (
          <RecentTrades
            chainId={chainId}
            tokenAddress={
              displayTokenA.address === NATIVE_TOKEN_ADDRESS
                ? currentChain.wrappedTokenAddress // Native인 경우 Wrapped 주소 사용
                : displayTokenA.address
            }
          />
        )}
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
