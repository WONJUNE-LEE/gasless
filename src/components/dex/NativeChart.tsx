"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  CrosshairMode,
  CandlestickSeries, // [추가] v5 필수 import
  HistogramSeries, // [추가] v5 필수 import
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
}

export default function NativeChart({ data, colors }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

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
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        scaleMargins: {
          top: 0.1, // 캔들 영역 (위쪽 90% 사용)
          bottom: 0.2, // 아래쪽 볼륨 영역 확보
        },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        timeVisible: true,
      },
    });

    chartRef.current = chart;

    // 2. 캔들스틱 시리즈 추가 (v5 방식: addSeries 사용)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    // 3. 볼륨 시리즈 (히스토그램) 추가 (v5 방식: addSeries 사용)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "", // 메인 가격 스케일과 분리 (Overlay)
    });

    // 볼륨 스케일 조정 (차트 하단에 위치하도록)
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.85, // 차트의 아래쪽 15%만 사용
        bottom: 0,
      },
    });

    // 데이터 변환 및 설정
    const candleData = data.map((d) => ({
      time: d.time as any,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    const volumeData = data.map((d) => ({
      time: d.time as any,
      value: d.value || 0, // value가 없으면 0 처리
      color:
        d.close >= d.open ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
    }));

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    // 차트 리사이즈 핸들러
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
