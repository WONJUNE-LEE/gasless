"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Check, Copy } from "lucide-react";
import { TokenInfo } from "@/lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tokens: TokenInfo[];
  onSelect: (token: TokenInfo) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedToken?: TokenInfo;
}

export default function TokenSelector({
  isOpen,
  onClose,
  tokens,
  onSelect,
  searchQuery,
  setSearchQuery,
  selectedToken,
}: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 1. 배경 (Backdrop) - 누르면 닫힘 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />

          {/* 2. 모달 본체 (Apple Style Pop-up) */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-full max-w-md bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden pointer-events-auto flex flex-col max-h-[80vh]"
            >
              {/* 헤더 */}
              <div className="p-5 border-b border-gray-200/50 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-bold tracking-tight">
                  Select Token
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 검색창 */}
              <div className="p-4 pb-2">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search name or paste address"
                    className="w-full h-12 pl-11 pr-4 rounded-2xl bg-gray-100 dark:bg-black/20 border-none outline-none font-medium text-lg placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              {/* 토큰 리스트 */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {tokens.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    No tokens found
                  </div>
                ) : (
                  tokens.map((token) => (
                    <button
                      key={token.address}
                      onClick={() => onSelect(token)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all group ${
                        selectedToken?.address === token.address
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : "hover:bg-gray-100 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* 로고 */}
                        {token.logoURI ? (
                          <img
                            src={token.logoURI}
                            alt={token.symbol}
                            className="w-10 h-10 rounded-full shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-sm font-bold shadow-inner">
                            {token.symbol[0]}
                          </div>
                        )}

                        {/* 텍스트 정보 */}
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">
                              {token.symbol}
                            </span>
                            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              {token.address.slice(0, 4)}...
                              {token.address.slice(-4)}
                              <Copy className="w-2.5 h-2.5 opacity-50" />
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 font-medium">
                            {token.name}
                          </div>
                        </div>
                      </div>

                      {/* 가격 & 잔액 (더미 데이터) */}
                      <div className="text-right">
                        <div className="font-medium">$3,240.50</div>
                        {selectedToken?.address === token.address && (
                          <motion.div
                            layoutId="check"
                            className="text-blue-500 flex justify-end"
                          >
                            <Check className="w-5 h-5" />
                          </motion.div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
