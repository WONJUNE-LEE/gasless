"use client";

import {
  createChart,
  ColorType,
  IChartApi,
  CandlestickSeries,
} from "lightweight-charts";
import React, { useEffect, useRef } from "react";

// [수정] ChartProps에서 불필요한 props 제거
interface ChartProps {
  data: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }[];
  colors?: {
    textColor?: string;
    upColor?: string;
    downColor?: string;
  };
}

export default function NativeChart({ data, colors }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: colors?.textColor || "#9CA3AF",
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        timeVisible: true,
      },
    });

    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: colors?.upColor || "#22c55e",
      downColor: colors?.downColor || "#ef4444",
      borderVisible: false,
      wickUpColor: colors?.upColor || "#22c55e",
      wickDownColor: colors?.downColor || "#ef4444",
    });

    if (data.length > 0) {
      // 시간순 정렬 보장
      const sortedData = [...data].sort((a, b) => a.time - b.time);
      series.setData(sortedData as any);
      chart.timeScale().fitContent();
    }

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, colors]);

  return <div ref={chartContainerRef} className="w-full h-full" />;
}
