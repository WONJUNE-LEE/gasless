// src/components/layout/Header.tsx
"use client";

import { Wallet, Search } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function Header() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border-color)] bg-[var(--header-bg)] backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl font-black tracking-tight text-butter drop-shadow-sm group-hover:scale-105 transition-transform">
            gome.fi
          </span>
        </Link>

        {/* 중앙: 종목 검색창 */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="w-full relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-white transition-colors" />
            <input
              type="text"
              readOnly
              onClick={() => {
                // [수정] 'open-token-selector-chart' 이벤트 발송
                // 차트용 토큰(Token A)을 변경하기 위함
                window.dispatchEvent(new Event("open-token-selector-chart"));
              }}
              placeholder="Search token (e.g. BTC, ETH)"
              className="w-full h-10 rounded-full bg-white/5 border border-white/5 focus:border-white/20 px-10 text-sm outline-none transition-all placeholder-gray-500 text-white cursor-pointer hover:bg-white/10"
            />
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
