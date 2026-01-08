"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search, Wallet, User, ArrowRightLeft, Coins } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import TokenSelector from "@/components/dex/TokenSelector";
import { TokenInfo } from "@/lib/api";

// 체인 메타데이터 매핑 (아이콘 등)
const CHAIN_METADATA: Record<number, { name: string; icon: React.ReactNode }> =
  {
    80085: {
      name: "Berachain Artio",
      icon: (
        <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center font-bold text-white text-[10px] shadow-sm">
          B
        </div>
      ),
    },
    // 다른 체인 추가 가능
  };

// 기본 체인 아이콘 (매핑된 것이 없을 때 사용)
const DefaultChainIcon = () => (
  <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center text-white text-[8px]">
    UNK
  </div>
);

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

  // 현재 선택된 체인의 아이콘 가져오기
  const getCurrentChainIcon = (walletChainIconUrl?: string) => {
    // 1. 직접 정의된 메타데이터가 있으면 우선 사용 (Berachain 등)
    if (CHAIN_METADATA[selectedChainId]) {
      return CHAIN_METADATA[selectedChainId].icon;
    }
    // 2. 지갑이 연결되어 있고, 지갑의 체인이 현재 선택된 체인과 같다면 지갑 제공 아이콘 사용
    if (walletChainIconUrl) {
      return (
        <img
          src={walletChainIconUrl}
          alt="Chain"
          className="w-5 h-5 rounded-full"
        />
      );
    }
    // 3. 기본 아이콘
    return <DefaultChainIcon />;
  };

  return (
    <>
      {/* ===========================================
        [데스크탑] 다이내믹 아일랜드 스타일
      =========================================== */}
      {/* 수정: max-w-7xl(1280px) 대신 max-w-[1260px]를 사용하여 스크롤바 너비만큼의 오차 보정 시도 */}
      <header className="hidden md:flex fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[1220px] px-4 transition-all duration-300">
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

                // 현재 선택된 체인 아이콘 (지갑 연결 여부와 상관없이 selectedChainId 기준)
                const currentChainIcon = getCurrentChainIcon(chain?.iconUrl);

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
                          <button
                            onClick={openAccountModal}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all shadow-lg"
                          >
                            {/* 네트워크 아이콘: selectedChainId 기반 */}
                            <div className="mr-1">{currentChainIcon}</div>

                            <span>{account.displayName}</span>
                            <User className="w-4 h-4 ml-1 opacity-70" />
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

      <nav
        className={`md:hidden fixed left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm transition-all duration-500 ease-in-out ${
          scrollDirection === "down"
            ? "bottom-[-100px] opacity-0"
            : "bottom-6 opacity-100"
        }`}
      >
        <div className="flex items-center justify-between bg-white/15 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-full px-4 py-2.5">
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all ${
                    isActive
                      ? "bg-white text-black shadow-sm"
                      : "text-white/70 hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              );
            })}
          </div>

          <div className="w-px h-8 bg-white/20 mx-2"></div>

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

              // 모바일에서도 동일하게 적용
              const currentChainIcon = getCurrentChainIcon(chain?.iconUrl);

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
                          className="flex-1 flex items-center justify-center gap-2 h-12 rounded-full px-4 font-bold text-xs bg-white text-black shadow-md transition-colors"
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
                          className="flex-1 h-12 rounded-full px-2 font-bold text-xs bg-red-500 text-white shadow-md"
                        >
                          Wrong Net
                        </button>
                      );
                    }

                    return (
                      <>
                        <button
                          onClick={openAccountModal}
                          className="flex-1 flex items-center justify-center gap-2 h-12 rounded-full px-3 font-bold text-xs bg-black/40 text-white border border-white/10 shadow-md truncate"
                        >
                          {/* 모바일 네트워크 아이콘 추가 */}
                          <div className="mr-1 scale-90">
                            {currentChainIcon}
                          </div>
                          <span>{account.displayName}</span>
                          <User className="w-4 h-4 ml-1 opacity-70" />
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
