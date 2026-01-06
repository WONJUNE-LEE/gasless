"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Check } from "lucide-react";
import { TokenInfo, CHAINS, fetchTokenList } from "@/lib/api";
import { useEffect, useState, useMemo } from "react";

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
  const [allTokens, setAllTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 1. 체인 변경 시 전체 토큰 로드 (인수 1개만 전달)
  useEffect(() => {
    if (!isOpen) return;

    const loadTokens = async () => {
      setIsLoading(true);
      // [수정됨] searchQuery 제거, chainId만 전달
      const tokens = await fetchTokenList(selectedChainId);
      setAllTokens(tokens);
      setIsLoading(false);
    };

    loadTokens();
  }, [selectedChainId, isOpen]);

  // 2. 검색어 필터링 (클라이언트 사이드)
  const filteredTokens = useMemo(() => {
    if (!searchQuery) return allTokens.slice(0, 100);

    const lowerQuery = searchQuery.toLowerCase();
    return allTokens
      .filter(
        (t) =>
          t.symbol.toLowerCase().includes(lowerQuery) ||
          t.name.toLowerCase().includes(lowerQuery) ||
          t.address.toLowerCase() === lowerQuery
      )
      .slice(0, 100);
  }, [allTokens, searchQuery]);

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
              transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
              className="w-full max-w-2xl rounded-3xl overflow-hidden pointer-events-auto flex h-[700px] max-h-[85vh] bg-[#121212] border border-white/10 shadow-2xl"
            >
              {/* Left Sidebar: Networks */}
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
                        onSelectChain(chain.id);
                        setSearchQuery("");
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        selectedChainId === chain.id
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

              {/* Right Content: Token List */}
              <div className="flex-1 flex flex-col min-w-0 bg-[#121212]">
                <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
                  <h3 className="text-xl font-bold tracking-tight text-white">
                    Select Token
                  </h3>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 pb-2 shrink-0">
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
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {isLoading ? (
                    <div className="text-center py-20 text-gray-500 flex flex-col items-center gap-3">
                      <div className="w-6 h-6 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                      <span className="text-sm">Loading Token List...</span>
                    </div>
                  ) : filteredTokens.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 text-sm">
                      No tokens found
                    </div>
                  ) : (
                    filteredTokens.map((token) => (
                      <button
                        key={`${token.chainId}-${token.address}`}
                        onClick={() => onSelect(token)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all group ${
                          selectedToken?.address === token.address
                            ? "bg-blue-500/10 border border-blue-500/20"
                            : "hover:bg-white/5 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-4 overflow-hidden">
                          {token.logoURI ? (
                            <img
                              src={token.logoURI}
                              alt={token.symbol}
                              className="w-10 h-10 rounded-full bg-white/10 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                                (
                                  e.target as HTMLImageElement
                                ).nextElementSibling?.classList.remove(
                                  "hidden"
                                );
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-sm font-bold shadow-inner shrink-0 text-white">
                              {token.symbol[0]}
                            </div>
                          )}
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 hidden items-center justify-center text-sm font-bold shadow-inner shrink-0 text-white">
                            {token.symbol[0]}
                          </div>

                          <div className="text-left min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg text-white truncate">
                                {token.symbol}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 font-medium truncate">
                              {token.name}
                            </div>
                          </div>
                        </div>

                        {selectedToken?.address === token.address && (
                          <div className="text-blue-500 pl-2">
                            <Check className="w-5 h-5" />
                          </div>
                        )}
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
