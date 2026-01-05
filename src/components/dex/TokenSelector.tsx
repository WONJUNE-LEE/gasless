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
          {/* Backdrop (어둡게 처리하여 팝업 강조) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
              /* 배경을 거의 불투명하게 설정 (95%) */
              className="w-full max-w-md glass-panel rounded-3xl overflow-hidden pointer-events-auto flex flex-col max-h-[80vh] bg-white/95 dark:bg-[#1a1a1a]/95"
            >
              {/* Header */}
              <div className="p-5 border-b border-gray-200/50 dark:border-white/10 flex items-center justify-between">
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

              {/* Search */}
              <div className="p-4 pb-2">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search name or paste address"
                    className="w-full h-12 pl-11 pr-4 rounded-2xl glass-input outline-none font-medium placeholder-gray-400 focus:ring-2 focus:ring-blue-500/30 transition-all bg-transparent"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              {/* Token List */}
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
                          ? "bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20"
                          : "hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Logo */}
                        {token.logoURI ? (
                          <img
                            src={token.logoURI}
                            alt={token.symbol}
                            className="w-10 h-10 rounded-full shadow-sm bg-white"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-sm font-bold shadow-inner">
                            {token.symbol[0]}
                          </div>
                        )}

                        {/* Info */}
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">
                              {token.symbol}
                            </span>
                            <span className="text-[10px] text-gray-400 border border-gray-200 dark:border-white/10 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              {token.address.slice(0, 4)}...
                              {token.address.slice(-4)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 font-medium">
                            {token.name}
                          </div>
                        </div>
                      </div>

                      {/* Right: Check Icon */}
                      <div className="text-right">
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
