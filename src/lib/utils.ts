import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatUnits, parseUnits } from "ethers";
import { useEffect, useState } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 1 -> 1000000000000000000 변환
export const toWei = (amount: string, decimals: number = 18) => {
  try {
    return parseUnits(amount, decimals).toString();
  } catch (e) {
    return "0";
  }
};

// 1000000 -> 1 변환 (소수점 4자리까지만 표시)
export const fromWei = (amount: string, decimals: number = 18) => {
  try {
    const formatted = formatUnits(amount, decimals);
    // 소수점 정리
    const [integer, fraction] = formatted.split(".");
    if (!fraction) return integer;
    return `${integer}.${fraction.slice(0, 4)}`;
  } catch (e) {
    return "0";
  }
};

// useDebounce가 없다면 간단히 내장해서 사용
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
