"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
} from "lightweight-charts";

interface ChartData {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  value?: number;
  color?: string;
}

interface Props {
  data: ChartData[];
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
    areaTopColor?: string;
    areaBottomColor?: string;
  };
  onLoadMore?: () => void;
}

export default function NativeChart({ data, colors, onLoadMore }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);

  // [추가] 쓰로틀링을 위한 마지막 호출 시간 기록용 Ref
  const lastFetchTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. 차트 생성
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: colors?.textColor || "#d1d5db",
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
      },
    });

    // 2. 시리즈 추가
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // 3. 리사이즈 핸들러
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    // [수정] 4. 무한 스크롤 핸들러 (쓰로틀링 적용)
    const timeScale = chart.timeScale();

    const handleVisibleRangeChange = () => {
      const logicalRange = timeScale.getVisibleLogicalRange();
      // 왼쪽 끝(과거)에 도달했는지 확인 (from < 0)
      if (logicalRange && logicalRange.from < 0) {
        const now = Date.now();
        // [핵심] 1.5초(1500ms) 쿨타임 적용. 이 시간 내에는 재요청하지 않음.
        if (now - lastFetchTimeRef.current > 1500) {
          lastFetchTimeRef.current = now;
          if (onLoadMore) {
            // console.log("Loading more history...");
            onLoadMore();
          }
        }
      }
    };

    timeScale.subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    return () => {
      window.removeEventListener("resize", handleResize);
      // 이벤트 구독 해제
      timeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      chart.remove();
    };
  }, []); // 초기화는 한 번만

  // 5. 데이터 업데이트
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    candleSeriesRef.current.setData(data);

    const volumeData = data.map((d) => ({
      time: d.time,
      value: d.value,
      color:
        d.close >= d.open ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
    }));
    volumeSeriesRef.current.setData(volumeData);
  }, [data]);

  return <div ref={chartContainerRef} className="w-full h-full" />;
}
