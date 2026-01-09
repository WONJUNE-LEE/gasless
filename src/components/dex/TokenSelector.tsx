"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Check, Copy } from "lucide-react";
import { TokenInfo, okxApi, CHAINS } from "@/lib/api";
import { useEffect, useState } from "react";
import { useDebounce } from "@/lib/utils";

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

  // 모달 열릴 때 초기화
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
    if (!token || !token.address) {
      alert("Invalid token data.");
      return;
    }
    if (activeChainId !== selectedChainId) {
      onSelectChain(activeChainId);
    }
    onSelect(token);
    onClose();
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
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            // [변경] 2단 구조를 위해 너비 확장 (max-w-md -> max-w-4xl)
            className="fixed inset-0 z-[70] m-auto w-full max-w-4xl h-[650px] max-h-[90vh] glass-panel rounded-3xl flex shadow-2xl overflow-hidden border border-white/10"
          >
            {/* 1. Left Sidebar: Chain Selection */}
            <div className="w-20 md:w-64 flex flex-col border-r border-white/5 bg-black/20 backdrop-blur-md">
              <div className="p-4 md:p-6 border-b border-white/5">
                <h3 className="text-xs font-bold text-gray-500 uppercase hidden md:block">
                  Networks
                </h3>
                <h3 className="text-xs font-bold text-gray-500 uppercase md:hidden text-center">
                  Net
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2 scrollbar-hide space-y-1">
                {CHAINS.map((chain) => (
                  <button
                    key={chain.id}
                    onClick={() => setActiveChainId(chain.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      activeChainId === chain.id
                        ? "bg-white/10 text-white shadow-inner border border-white/5"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent"
                    }`}
                  >
                    <img
                      src={chain.logo}
                      alt={chain.name}
                      className="w-8 h-8 md:w-6 md:h-6 rounded-full bg-white/10"
                    />
                    <span className="font-bold text-sm hidden md:block truncate">
                      {chain.name}
                    </span>
                    {activeChainId === chain.id && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] hidden md:block" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Right Content: Token Selection */}
            <div className="flex-1 flex flex-col min-w-0 bg-transparent">
              {/* Header */}
              <div className="p-4 md:p-6 border-b border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-black text-white">
                    Select Token
                  </h2>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search name, symbol or address"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-black/30 transition-all font-medium"
                    autoFocus
                  />
                </div>
              </div>

              {/* Token List */}
              <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium">
                      Loading tokens...
                    </span>
                  </div>
                ) : tokens.length > 0 ? (
                  <div className="grid gap-1 px-2 pb-2">
                    {tokens.map((token) => (
                      <button
                        key={`${token.chainId}-${token.address}`}
                        onClick={() => handleTokenSelect(token)}
                        className={`group flex items-center justify-between p-3 rounded-xl transition-all ${
                          selectedToken?.address === token.address
                            ? "bg-blue-500/10 border border-blue-500/30"
                            : "hover:bg-white/5 border border-transparent hover:border-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-4 overflow-hidden">
                          <div className="relative shrink-0">
                            {token.logoURI ? (
                              <img
                                src={token.logoURI}
                                alt={token.symbol}
                                className="w-10 h-10 rounded-full bg-gray-800 object-cover shadow-lg group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">
                                {token.symbol.slice(0, 2)}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-start min-w-0">
                            <div className="flex items-center gap-2 max-w-full">
                              <span className="text-base font-bold text-white truncate">
                                {token.symbol}
                              </span>
                              <span className="text-xs text-gray-500 truncate hidden sm:block">
                                {token.name}
                              </span>
                            </div>

                            {/* Contract Address Display */}
                            <div className="flex items-center gap-1.5 mt-0.5 max-w-full">
                              <span className="text-[10px] font-mono text-gray-500 bg-white/5 px-1.5 py-0.5 rounded flex items-center gap-1 group-hover:bg-white/10 transition-colors">
                                {token.address.slice(0, 6)}...
                                {token.address.slice(-4)}
                                <button
                                  onClick={(e) => handleCopy(e, token.address)}
                                  className="ml-1 hover:text-white transition-colors"
                                  title="Copy Address"
                                >
                                  {copiedAddress === token.address ? (
                                    <Check className="w-3 h-3 text-green-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </span>
                            </div>
                          </div>
                        </div>

                        {selectedToken?.address === token.address && (
                          <Check className="w-5 h-5 text-blue-400 mr-2" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                    <Search className="w-10 h-10 opacity-20" />
                    <p>No tokens found</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
