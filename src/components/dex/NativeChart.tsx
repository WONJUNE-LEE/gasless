"use client";

import {
  createChart,
  ColorType,
  IChartApi,
  CandlestickSeries,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

interface Props {
  data: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }[];
  colors?: { textColor?: string };
  activeTimeframe: string;
  onTimeframeChange: (tf: string) => void;
}

const TIMEFRAMES = ["1H", "4H", "1D", "1W"];

export default function NativeChart({
  data,
  colors,
  activeTimeframe,
  onTimeframeChange,
}: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: colors?.textColor || "#9ca3af",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(255, 255, 255, 0.05)", style: 1 },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderVisible: false,
      },
      rightPriceScale: {
        borderVisible: false, // 우측 가격축 선 제거
        scaleMargins: {
          top: 0.1, // 차트 여백
          bottom: 0.1,
        },
      },
    });

    const newSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const sortedData = [...data].sort((a, b) => a.time - b.time);
    newSeries.setData(sortedData as any);
    chart.timeScale().fitContent();

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, colors]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* 차트 헤더 (기간 선택) */}
      <div className="flex items-center justify-between px-1 pb-2 z-10">
        <div className="flex space-x-1 rounded-lg">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                activeTimeframe === tf
                  ? "text-blue-500 bg-blue-500/10"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 본체 */}
      <div ref={chartContainerRef} className="flex-1 w-full min-h-0" />
    </div>
  );
}
