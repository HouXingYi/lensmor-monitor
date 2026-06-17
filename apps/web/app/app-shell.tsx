"use client";

import { Button, Layout, Menu, Space, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

const { Header, Content } = Layout;

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <Space className="app-header-inner" size="large">
          <Typography.Title className="app-title" level={4}>
            <Link href="/competitors">Lensmor Monitor</Link>
          </Typography.Title>
          <Menu
            className="app-menu"
            items={[
              { key: "/competitors", label: <Link href="/competitors">竞品</Link> },
              { key: "/inbox", label: <Link href="/inbox">收件箱</Link> },
            ]}
            mode="horizontal"
            selectedKeys={[pathname.startsWith("/inbox") || pathname.startsWith("/reports") ? "/inbox" : "/competitors"]}
          />
        </Space>
        <Button loading={loggingOut} onClick={logout}>
          退出
        </Button>
      </Header>
      <Content className="app-content">{children}</Content>
    </Layout>
  );
}
