"use client";

import { Wallet, Sun, Moon, Search } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border-color)] bg-[var(--header-bg)] backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight text-blue-600 dark:text-blue-500">
            FlashDex
          </span>
        </Link>

        {/* 중앙: 종목 검색창 (토스증권 느낌) */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search token (e.g. BTC, ETH)"
              className="w-full h-10 rounded-full bg-gray-100 dark:bg-zinc-900 border border-transparent focus:border-blue-500 px-10 text-sm outline-none transition-all placeholder-gray-500 dark:text-white"
            />
          </div>
        </div>

        {/* 우측 컨트롤 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full p-2.5 bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          <button className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-all">
            <Wallet className="h-4 w-4" />
            <span>Connect</span>
          </button>
        </div>
      </div>
    </header>
  );
}
