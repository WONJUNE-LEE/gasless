// src/components/layout/Header.tsx
"use client";

import { Wallet, Search } from "lucide-react";
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
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 active:scale-95">
            <Wallet className="h-4 w-4" />
            <span>Connect</span>
          </button>
        </div>
      </div>
    </header>
  );
}
