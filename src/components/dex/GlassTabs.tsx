"use client";

import { motion } from "framer-motion";

interface TabProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (id: any) => void;
  layoutId: string; // 애니메이션 구분을 위한 고유 ID
}

export default function GlassTabs({
  tabs,
  activeTab,
  onChange,
  layoutId,
}: TabProps) {
  return (
    <div className="flex bg-gray-100/50 dark:bg-black/20 p-1 rounded-2xl backdrop-blur-md relative z-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 z-10 ${
            activeTab === tab.id
              ? "text-black dark:text-white"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          {/* 배경이 스윽- 하고 움직이는 애니메이션 (Magic Motion) */}
          {activeTab === tab.id && (
            <motion.div
              layoutId={layoutId}
              className="absolute inset-0 bg-white dark:bg-white/10 rounded-xl shadow-sm"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {tab.label} {tab.icon}
          </span>
        </button>
      ))}
    </div>
  );
}
