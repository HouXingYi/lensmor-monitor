"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <Link className="app-brand" href="/competitors">
          Lensmor Monitor
        </Link>
        <nav className="app-nav" aria-label="主导航">
          <Link href="/competitors">竞品</Link>
          <Link href="/inbox">收件箱</Link>
          <button disabled={loggingOut} onClick={logout} type="button">
            {loggingOut ? "退出中..." : "退出"}
          </button>
        </nav>
      </header>
      {children}
    </main>
  );
}
