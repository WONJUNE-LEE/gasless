// src/components/layout/Header.tsx
"use client";

import { Wallet, Search } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit"; // [추가]
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Next.js 13+ App Router

export default function Header() {
  // 헤더 검색창 클릭 시 메인 페이지의 토큰 선택 팝업을 여는 이벤트 발생
  const handleOpenSearch = () => {
    // Custom Event Dispatch
    window.dispatchEvent(new CustomEvent("open-token-selector"));
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border-color)] bg-[var(--header-bg)] backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl font-black tracking-tight text-butter drop-shadow-sm group-hover:scale-105 transition-transform">
            gome.fi
          </span>
        </Link>

        {/* Global Search Trigger */}
        <div className="flex-1 max-w-xl relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            readOnly // 직접 입력 방지 (팝업 유도)
            onClick={handleOpenSearch}
            placeholder="Search tokens (ETH, USDC...)"
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 outline-none hover:bg-white/10 hover:border-white/20 focus:border-blue-500/50 transition-all text-sm text-white placeholder-gray-500 cursor-pointer"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
            <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
              /
            </span>
          </div>
        </div>

        {/* 우측 컨트롤 */}
        {/* [수정] Wallet Connection */}
        <div className="flex items-center gap-3">
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              const ready = mounted && authenticationStatus !== "loading";
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus ||
                  authenticationStatus === "authenticated");

              return (
                <div
                  {...(!ready && {
                    "aria-hidden": true,
                    style: {
                      opacity: 0,
                      pointerEvents: "none",
                      userSelect: "none",
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button
                          onClick={openConnectModal}
                          className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors shadow-lg shadow-blue-900/20"
                        >
                          Connect Wallet
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          className="h-9 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors"
                        >
                          Wrong Network
                        </button>
                      );
                    }

                    return (
                      <div className="flex items-center gap-2">
                        {/* Chain Switcher */}
                        <button
                          onClick={openChainModal}
                          className="h-9 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold transition-all flex items-center gap-2"
                        >
                          {chain.hasIcon && (
                            <div
                              style={{
                                background: chain.iconBackground,
                                width: 20,
                                height: 20,
                                borderRadius: 999,
                                overflow: "hidden",
                                marginRight: 4,
                              }}
                            >
                              {chain.iconUrl && (
                                <img
                                  alt={chain.name ?? "Chain icon"}
                                  src={chain.iconUrl}
                                  style={{ width: 20, height: 20 }}
                                />
                              )}
                            </div>
                          )}
                          {chain.name}
                        </button>

                        {/* Account Balance & Address */}
                        <button
                          onClick={openAccountModal}
                          className="h-9 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold transition-all"
                        >
                          {account.displayName}
                          {account.displayBalance
                            ? ` (${account.displayBalance})`
                            : ""}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </header>
  );
}
