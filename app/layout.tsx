import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atrix Congress Intelligence Workspace",
  description: "From congress signal to action-ready intelligence.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
