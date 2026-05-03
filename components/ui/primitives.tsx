// components/ui/primitives.tsx
import { ReactNode } from "react";
import Link from "next/link";

export const Tag = ({
  children, color = "#f2e8d0", bg = "transparent",
}: { children: ReactNode; color?: string; bg?: string }) => (
  <span
    className="f-mono inline-flex items-center gap-1.5 px-2 py-1 text-xs uppercase"
    style={{ color, background: bg, border: `1px solid ${color}40`, letterSpacing: "0.2em" }}
  >
    {children}
  </span>
);

export const Label = ({ children }: { children: ReactNode }) => (
  <div
    className="f-mono text-[10px] uppercase mb-2.5 text-muted"
    style={{ letterSpacing: "0.24em" }}
  >
    {children}
  </div>
);

export const BrandMark = ({ size = "xl" }: { size?: "xl" | "sm" }) => (
  <Link
    href="/lobby"
    aria-label="Go to lobby"
    className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
  >
    <div
      className="relative flex items-center justify-center bg-electric"
      style={{ width: size === "xl" ? 32 : 24, height: size === "xl" ? 32 : 24 }}
    >
      <div className="bg-ink rounded-full" style={{ width: 6, height: 6 }} />
    </div>
    <span
      className={`f-display font-black tracking-tight text-cream ${
        size === "xl" ? "text-3xl" : "text-xl"
      }`}
    >
      OCHE<span className="text-oche-red">.</span>
    </span>
  </Link>
);
