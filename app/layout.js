import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "InfraAlign — Civic Infrastructure & Intelligence",
  description:
    "Real-time citizen complaint classification, geographic infrastructure correlation, and AI-powered civic prioritization.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
          <Navbar />
          <div className="flex-1">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
