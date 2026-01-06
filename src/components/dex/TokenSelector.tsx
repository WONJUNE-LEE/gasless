"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Check, Copy, Star } from "lucide-react";
import { TokenInfo, CHAINS, okxApi } from "@/lib/api";
import { useEffect, useState } from "react";
import { useDebounce } from "@/lib/utils";

// [설정] 빠른 접근 토큰 목록 (구조 예시, 실제 데이터로 교체 필요)
// address는 해당 체인의 실제 주소여야 작동합니다.
const QUICK_TOKENS = [
  { symbol: "ETH", name: "Ethereum", isNative: true },
  { symbol: "USDT", name: "Tether USD" },
  { symbol: "USDC", name: "USD Coin" },
  { symbol: "WBTC", name: "Wrapped BTC" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: TokenInfo) => void;
  selectedToken?: TokenInfo;
  selectedChainId: number;
  onSelectChain: (chainId: number) => void;
}

export default function TokenSelector({
  isOpen,
  onClose,
  onSelect,
  selectedToken,
  selectedChainId,
  onSelectChain,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeChainId, setActiveChainId] = useState(selectedChainId);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // 모달 초기화
  useEffect(() => {
    if (isOpen) {
      setActiveChainId(selectedChainId);
      setSearchQuery("");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, selectedChainId]);

  // 토큰 목록 로드
  useEffect(() => {
    if (!isOpen) return;

    const loadTokens = async () => {
      setIsLoading(true);
      try {
        const fetchedTokens = await okxApi.getTokens(
          activeChainId,
          debouncedSearch
        );
        setTokens(fetchedTokens);
      } catch (e) {
        console.error("Failed to load tokens", e);
        setTokens([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTokens();
  }, [activeChainId, debouncedSearch, isOpen]);

  const handleCopy = (e: React.MouseEvent, address: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleTokenSelect = (token: TokenInfo) => {
    onSelect(token);
    onClose();
  };

  // Quick Token 클릭 핸들러 (현재 로드된 목록에서 찾아서 선택)
  const handleQuickSelect = (symbol: string) => {
    const target = tokens.find((t) => t.symbol === symbol);
    if (target) {
      handleTokenSelect(target);
    } else {
      // 목록에 없을 경우 검색어로 입력해줌
      setSearchQuery(symbol);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md"
          />

          <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-2xl rounded-3xl overflow-hidden pointer-events-auto flex h-[700px] max-h-[85vh] bg-[#121212] border border-white/10 shadow-2xl"
            >
              {/* Networks Sidebar */}
              <div className="w-[140px] md:w-[180px] border-r border-white/10 flex flex-col bg-[#0a0a0a]">
                <div className="p-4 border-b border-white/10">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Networks
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {CHAINS.map((chain) => (
                    <button
                      key={chain.id}
                      onClick={() => {
                        setActiveChainId(chain.id);
                        setSearchQuery("");
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        activeChainId === chain.id
                          ? "bg-white/10 text-white shadow-sm border border-white/10 font-bold"
                          : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                      }`}
                    >
                      <img
                        src={chain.logo}
                        alt={chain.name}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm truncate">{chain.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Token List */}
              <div className="flex-1 flex flex-col min-w-0 bg-[#121212]">
                <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
                  <h3 className="text-xl font-bold tracking-tight text-white">
                    Select Token
                  </h3>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-white/10 text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 pb-2 shrink-0 space-y-4">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search name or paste address"
                      className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white/5 border border-white/10 outline-none font-medium placeholder-gray-500 text-white focus:border-blue-500/50 transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>

                  {/* [신규] Quick Access Section */}
                  {!searchQuery && (
                    <div className="flex flex-wrap gap-2">
                      {QUICK_TOKENS.map((qt) => (
                        <button
                          key={qt.symbol}
                          onClick={() => handleQuickSelect(qt.symbol)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-xs font-bold text-gray-300 hover:text-white"
                        >
                          <Star className="w-3 h-3 text-yellow-500/80 fill-yellow-500/20" />
                          {qt.symbol}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {isLoading ? (
                    <div className="text-center py-20 text-gray-500 flex flex-col items-center gap-3">
                      <div className="w-6 h-6 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                      <span className="text-sm">Loading Token List...</span>
                    </div>
                  ) : tokens.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 text-sm">
                      No tokens found
                    </div>
                  ) : (
                    tokens.map((token) => (
                      <button
                        key={`${token.chainId}-${token.address}`}
                        onClick={() => handleTokenSelect(token)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all group ${
                          selectedToken?.address === token.address &&
                          selectedToken?.chainId === token.chainId
                            ? "bg-blue-500/10 border border-blue-500/20"
                            : "hover:bg-white/5 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-4 overflow-hidden min-w-0">
                          {token.logoURI ? (
                            <img
                              src={token.logoURI}
                              alt={token.symbol}
                              className="w-10 h-10 rounded-full bg-white/10 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                              {token.symbol[0]}
                            </div>
                          )}
                          <div className="text-left min-w-0 flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg text-white truncate">
                                {token.symbol}
                              </span>
                              {token.isNative && (
                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1 rounded font-bold">
                                  NATIVE
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 font-medium truncate">
                              {token.name}
                            </div>
                          </div>
                        </div>

                        <div className="text-right pl-4">
                          {token.price && parseFloat(token.price) > 0 && (
                            <div className="text-sm font-medium text-white">
                              ${parseFloat(token.price).toLocaleString()}
                            </div>
                          )}
                          {token.change24h && (
                            <div
                              className={`text-xs ${
                                parseFloat(token.change24h) >= 0
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              {parseFloat(token.change24h) > 0 ? "+" : ""}
                              {parseFloat(token.change24h).toFixed(2)}%
                            </div>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
