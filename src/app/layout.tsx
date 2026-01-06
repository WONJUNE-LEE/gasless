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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-[#0a0a0a] text-white min-h-screen`}
      >
        {/* Providers로 감싸기 */}
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
