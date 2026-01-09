// src/components/dex/RecentTrades.tsx
"use client";

import { useEffect, useState } from "react";
import { ExternalLink, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Trade {
  id: string;
  time: number;
  type: "buy" | "sell";
  price: number;
  amount: number;
  volume: number;
  txHash: string;
  userAddress: string;
  baseSymbol: string;
  quoteSymbol: string;
}

interface RecentTradesProps {
  chainId: number;
  tokenAddress: string;
}

export default function RecentTrades({
  chainId,
  tokenAddress,
}: RecentTradesProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrades = async () => {
    try {
      const res = await fetch(
        `/api/trades?chainId=${chainId}&tokenAddress=${tokenAddress}`
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setTrades(data);
      }
    } catch (e) {
      console.error("Failed to fetch trades", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchTrades();
    const interval = setInterval(fetchTrades, 15000); // 15초마다 갱신
    return () => clearInterval(interval);
  }, [chainId, tokenAddress]);

  if (loading && trades.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        Loading trades...
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        No recent trades found.
      </div>
    );
  }

  return (
    <div className="w-full bg-white/5 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md">
      <div className="p-4 border-b border-white/5 font-bold text-white flex items-center gap-2">
        <span>Recent Trades</span>
        <span className="text-xs font-normal text-gray-500 bg-white/10 px-2 py-0.5 rounded-full">
          Live
        </span>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/20 text-gray-400 sticky top-0 backdrop-blur-md z-10">
            <tr>
              <th className="p-3 font-medium">Time</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium text-right">Price</th>
              <th className="p-3 font-medium text-right">Amount</th>
              <th className="p-3 font-medium text-right">Volume</th>
              <th className="p-3 font-medium text-right">Maker</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                <td className="p-3 text-gray-400 whitespace-nowrap">
                  {formatDistanceToNow(trade.time, { addSuffix: true }).replace(
                    "about ",
                    ""
                  )}
                </td>
                <td
                  className={`p-3 font-bold uppercase ${
                    trade.type === "buy" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {trade.type === "buy" ? "Buy" : "Sell"}
                </td>
                <td className="p-3 text-right font-mono text-white">
                  $
                  {trade.price.toLocaleString(undefined, {
                    maximumSignificantDigits: 6,
                  })}
                </td>
                <td className="p-3 text-right text-gray-300">
                  {trade.amount.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}{" "}
                  {trade.baseSymbol}
                </td>
                <td className="p-3 text-right text-white font-mono">
                  $
                  {trade.volume.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="p-3 text-right text-blue-400">
                  <a
                    href={`https://www.okx.com/web3/explorer/address/${trade.userAddress}`} // OKX Explorer 링크 예시
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-end gap-1 hover:underline"
                  >
                    {trade.userAddress.slice(0, 4)}...
                    {trade.userAddress.slice(-4)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
