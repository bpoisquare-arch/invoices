import type { Metadata } from "next";
import { Poppins, Montserrat } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-montserrat",
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
    <html lang="en" className={`h-full antialiased ${poppins.variable} ${montserrat.variable}`}>
      <body className={`min-h-full flex flex-col bg-[#F8FAFC] text-slate-900 ${poppins.className}`}>
        {children}
      </body>
    </html>
  );
}
