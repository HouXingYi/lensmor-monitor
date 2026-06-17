import type { ReactNode } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";

import "antd/dist/reset.css";
import "./globals.css";
import { AntdProvider } from "./antd-provider";

export const metadata = {
  title: "Lensmor Monitor",
  description: "竞品监控 MVP",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>
          <AntdProvider>{children}</AntdProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
