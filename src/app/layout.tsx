import "./globals.css";
import { ThemeProvider } from "next-themes";
import Header from "@/components/layout/Header";

export const metadata = {
  title: "FlashDex - Gasless Trading",
  description: "Trade with zero gas fees on Hyperliquid",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col antialiased">
        {/* attribute="class"로 설정해야 Tailwind 다크모드와 호환됩니다 */}
        <ThemeProvider attribute="class">
          <Header />
          <main className="flex-1 flex flex-col items-center justify-center p-4">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
