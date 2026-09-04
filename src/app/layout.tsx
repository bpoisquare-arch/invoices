import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SwiftInvoice Pro - Enterprise Billing & Invoice Management System",
  description: "Internal Multi-Company Invoice Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`h-full antialiased ${geist.variable}`}>
      <body className={`min-h-full flex flex-col bg-[#F8FAFC] text-slate-900 font-sans ${geist.className}`}>
        <TooltipProvider delay={0}>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}


