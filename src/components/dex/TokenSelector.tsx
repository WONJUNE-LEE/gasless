// src/components/dex/TokenSelector.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Check, Copy, ExternalLink } from "lucide-react";
import { TokenInfo, CHAINS, fetchTokenList } from "@/lib/api";
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

  // [수정 3] 로컬 체인 상태 관리 (UI 즉시 반영 방지)
  // 모달이 열릴 때만 부모의 chainId로 초기화
  const [activeChainId, setActiveChainId] = useState(selectedChainId);

  // 복사 알림 상태
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

  // 토큰 목록 로드 (activeChainId 기준)
  useEffect(() => {
    if (!isOpen) return;

    const loadTokens = async () => {
      setIsLoading(true);
      const fetchedTokens = await fetchTokenList(
        activeChainId, // 로컬 체인 ID 사용
        debouncedSearch
      );
      setTokens(fetchedTokens);
      setIsLoading(false);
    };

    loadTokens();
  }, [activeChainId, debouncedSearch, isOpen]);

  // 주소 복사 핸들러
  const handleCopy = (e: React.MouseEvent, address: string) => {
    e.stopPropagation(); // 부모 클릭 방지
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // [수정 3-2] 토큰 선택 시 체인과 토큰을 함께 업데이트
  const handleTokenSelect = (token: TokenInfo) => {
    // 1. 체인이 변경되었다면 부모에게 알림
    if (activeChainId !== selectedChainId) {
      onSelectChain(activeChainId);
    }
    // 2. 토큰 선택
    onSelect(token);
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
              transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
              className="w-full max-w-2xl rounded-3xl overflow-hidden pointer-events-auto flex h-[700px] max-h-[85vh] bg-[#121212] border border-white/10 shadow-2xl"
            >
              {/* Sidebar (Networks) */}
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
                        setActiveChainId(chain.id); // 로컬 상태만 변경
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

              {/* Main Content */}
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
                          selectedToken?.address === token.address
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
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-sm font-bold shrink-0 text-white">
                              {token.symbol[0]}
                            </div>
                          )}

                          <div className="text-left min-w-0 flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg text-white truncate">
                                {token.symbol}
                              </span>
                              {/* [수정 4, 5] 컨트랙트 주소 표시 및 복사 */}
                              <div
                                className="flex items-center gap-1 text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded-md hover:bg-white/10 cursor-pointer transition-colors"
                                onClick={(e) => handleCopy(e, token.address)}
                              >
                                <span>
                                  {token.address.slice(0, 4)}...
                                  {token.address.slice(-4)}
                                </span>
                                {copiedAddress === token.address ? (
                                  <Check className="w-3 h-3 text-green-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </div>
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
