import type { ReactNode } from "react";

import "./globals.css";

export const metadata = {
  title: "Lensmor Monitor",
  description: "竞品监控 MVP",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
