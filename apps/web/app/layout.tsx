import type { ReactNode } from "react";

export const metadata = {
  title: "Lensmor Monitor",
  description: "Competitor monitoring MVP",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
