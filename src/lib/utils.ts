import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatUnits, parseUnits } from "ethers";
import { useEffect, useState } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const toWei = (amount: string, decimals: number = 18) => {
  try {
    if (!amount) return "0";
    return parseUnits(amount, decimals).toString();
  } catch (e) {
    return "0";
  }
};

// [수정] 소액도 잘 보이도록 포맷팅 개선
export const fromWei = (amount: string, decimals: number = 18) => {
  try {
    if (!amount || amount === "0") return "0";
    const formatted = formatUnits(amount, decimals);

    // 숫자가 너무 작으면 (예: 0.00000123) 그대로 표시하거나 소수점 6~8자리까지 허용
    const num = parseFloat(formatted);
    if (num === 0) return "0";

    if (num < 0.0001) {
      // 매우 작은 수는 소수점 8자리까지, 뒷부분 0 제거
      return parseFloat(num.toFixed(8)).toString();
    }

    // 일반적인 수는 소수점 6자리까지
    return parseFloat(num.toFixed(6)).toString();
  } catch (e) {
    return "0";
  }
};

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
