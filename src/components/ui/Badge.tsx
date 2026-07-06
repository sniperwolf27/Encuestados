import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "success" | "neutral";
  className?: string;
}) {
  const toneClasses = tone === "success" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${toneClasses} ${className}`}>{children}</span>
  );
}
