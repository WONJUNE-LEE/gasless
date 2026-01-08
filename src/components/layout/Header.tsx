"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search, Wallet, User, ArrowRightLeft, Coins, X } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit"; // RainbowKit 가져오기
import TokenSelector from "@/components/dex/TokenSelector";
import { TokenInfo } from "@/lib/api";

// 스크롤 감지 훅
function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<"up" | "down" | null>(
    null
  );
  const lastScrollY = useRef(0);

  useEffect(() => {
    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      const direction = scrollY > lastScrollY.current ? "down" : "up";
      if (
        direction !== scrollDirection &&
        Math.abs(scrollY - lastScrollY.current) > 10
      ) {
        setScrollDirection(direction);
      }
      lastScrollY.current = scrollY > 0 ? scrollY : 0;
    };
    window.addEventListener("scroll", updateScrollDirection);
    return () => window.removeEventListener("scroll", updateScrollDirection);
  }, [scrollDirection]);

  return scrollDirection;
}

export default function Header() {
  const pathname = usePathname();
  const scrollDirection = useScrollDirection();

  // 상태 관리
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedChainId, setSelectedChainId] = useState(80085);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | undefined>(
    undefined
  );

  const navItems = [
    { name: "Swap", href: "/swap", icon: ArrowRightLeft },
    { name: "Staking", href: "/staking", icon: Coins },
  ];

  const handleTokenSelect = (token: TokenInfo) => {
    console.log("Selected Token:", token);
    setSelectedToken(token);
    setIsSearchOpen(false);
  };

  return (
    <>
      {/* ===========================================
        [데스크탑] 다이내믹 아일랜드 스타일
      =========================================== */}
      <header className="hidden md:flex fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-4 transition-all duration-300">
        <div className="w-full flex items-center justify-between bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-full px-6 py-3">
          {/* 좌측: 로고 & 네비게이션 */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center">
              <div className="w-9 h-9 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center font-bold text-white shadow-lg">
                B
              </div>
            </Link>

            <nav className="flex items-center gap-1 bg-black/20 rounded-full p-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? "bg-white text-black shadow-md"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* 중앙: 검색 버튼 */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex-1 max-w-sm mx-4 flex items-center gap-3 bg-black/20 border border-white/10 rounded-full py-2.5 px-5 text-sm text-white/50 hover:bg-black/30 hover:border-white/20 transition-all group"
          >
            <Search className="w-4 h-4 group-hover:text-white transition-colors" />
            <span className="group-hover:text-white/80">Search tokens...</span>
          </button>

          {/* 우측: 지갑 연결 (RainbowKit Custom Button 적용) */}
          <div className="flex items-center gap-3">
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openConnectModal,
                openChainModal,
                mounted,
              }) => {
                const ready = mounted;
                const connected = ready && account && chain;

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
                    className="flex items-center gap-2"
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-white text-black hover:bg-gray-100 transition-all shadow-lg"
                          >
                            <Wallet className="w-4 h-4" />
                            <span>Connect Wallet</span>
                          </button>
                        );
                      }

                      if (chain.unsupported) {
                        return (
                          <button
                            onClick={openChainModal}
                            className="px-5 py-2.5 rounded-full text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg"
                          >
                            Wrong Network
                          </button>
                        );
                      }

                      return (
                        <>
                          {/* 연결됨: 지갑 잔액/주소 표시 */}
                          <button
                            onClick={openAccountModal}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all shadow-lg"
                          >
                            {/* 체인 아이콘 (있으면 표시) */}
                            {chain.hasIcon && chain.iconUrl && (
                              <img
                                alt={chain.name ?? "Chain icon"}
                                src={chain.iconUrl}
                                className="w-5 h-5 rounded-full"
                              />
                            )}
                            <span>{account.displayName}</span>
                          </button>

                          {/* 연결된 상태에서만 보이는 내 프로필 버튼 */}
                          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all shadow-md">
                            <User className="w-5 h-5" />
                          </button>
                        </>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </header>

      {/* ===========================================
        [모바일] 상단 헤더 + 하단 플로팅 메뉴
      =========================================== */}

      {/* 1. 모바일 상단: 로고 & 검색 */}
      <header className="md:hidden fixed top-0 left-0 w-full z-40 bg-black/80 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/">
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-md">
            B
          </div>
        </Link>
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex-1 bg-white/10 border border-white/10 rounded-full py-2 px-4 flex items-center gap-2 text-sm text-white/50"
        >
          <Search className="w-4 h-4" />
          <span>Search...</span>
        </button>
      </header>

      {/* 2. 모바일 하단: 플로팅 메뉴 */}
      <nav
        className={`md:hidden fixed left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm transition-all duration-500 ease-in-out ${
          scrollDirection === "down"
            ? "bottom-[-100px] opacity-0"
            : "bottom-6 opacity-100"
        }`}
      >
        <div className="flex items-center justify-between bg-white/15 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-2xl px-3 py-2.5">
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all ${
                    isActive
                      ? "bg-white text-black shadow-sm"
                      : "text-white/70 hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium mt-0.5">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="w-px h-8 bg-white/20 mx-2"></div>

          {/* 모바일 지갑 연결 (RainbowKit Custom Button 적용) */}
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openConnectModal,
              openChainModal,
              mounted,
            }) => {
              const ready = mounted;
              const connected = ready && account && chain;

              return (
                <div
                  className="flex items-center gap-2 flex-1 justify-end"
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
                          className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl px-4 font-bold text-xs bg-white text-black shadow-md transition-colors"
                        >
                          <Wallet className="w-4 h-4" />
                          <span>Connect</span>
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          className="flex-1 h-12 rounded-xl px-2 font-bold text-xs bg-red-500 text-white shadow-md"
                        >
                          Wrong Net
                        </button>
                      );
                    }

                    return (
                      <>
                        <button
                          onClick={openAccountModal}
                          className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl px-3 font-bold text-xs bg-black/40 text-white border border-white/10 shadow-md truncate"
                        >
                          {/* 모바일에서는 아이콘 없이 텍스트만 깔끔하게 혹은 필요시 추가 */}
                          <span>{account.displayName}</span>
                        </button>

                        {/* 연결 시에만 보이는 내 정보 버튼 */}
                        <button className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/10 text-white border border-white/10 shrink-0">
                          <User className="w-5 h-5" />
                        </button>
                      </>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </nav>

      {/* ===========================================
        [공통] Token Selector
      =========================================== */}
      <TokenSelector
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelect={handleTokenSelect}
        selectedToken={selectedToken}
        selectedChainId={selectedChainId}
        onSelectChain={setSelectedChainId}
      />
    </>
  );
}
