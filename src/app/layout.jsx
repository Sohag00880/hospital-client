import { Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/components/providers/StoreProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { SessionBootstrap } from "@/components/providers/SessionBootstrap";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: { default: "Hospital SaaS", template: "%s | Hospital SaaS" },
  description: "Enterprise hospital management SaaS platform.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-background font-sans">
        <StoreProvider>
          <ThemeProvider>
            <SessionBootstrap>
              {children}
              <ToastProvider />
            </SessionBootstrap>
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}