import type { ReactNode } from "react";

const VARIANT_CLASSES = {
  solid: "bg-white border border-system-separator shadow-sm",
  glass: "bg-white/8 backdrop-blur-xl",
};

export function Card({
  children,
  variant = "solid",
  className = "",
}: {
  children: ReactNode;
  variant?: keyof typeof VARIANT_CLASSES;
  className?: string;
}) {
  return <div className={`rounded-2xl ${VARIANT_CLASSES[variant]} ${className}`}>{children}</div>;
}
