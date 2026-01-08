import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Providers } from "./providers"; // [추가]

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gasless DEX",
  description: "Swap tokens seamlessly",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen">
        <Providers>
          <Header />
          {/* 상단은 데스크탑 헤더 높이만큼, 하단은 모바일 메뉴 높이만큼 여백 확보 */}
          <main className="pt-24 pb-28 md:pt-32 md:pb-10 px-4 max-w-7xl mx-auto">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
