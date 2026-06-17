"use client";

import { App, ConfigProvider, type ThemeConfig } from "antd";
import zhCN from "antd/locale/zh_CN";
import { type ReactNode } from "react";

const theme: ThemeConfig = {
  token: {
    colorPrimary: "#2563eb",
    borderRadius: 12,
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  components: {
    Layout: {
      bodyBg: "#f5f7fb",
      headerBg: "#ffffff",
    },
  },
};

export function AntdProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider locale={zhCN} theme={theme}>
      <App>{children}</App>
    </ConfigProvider>
  );
}
