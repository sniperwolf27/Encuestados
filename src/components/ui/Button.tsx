"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

const VARIANT_CLASSES = {
  primary: "bg-brand-orange text-white",
  secondary: "border border-system-separator bg-white text-brand-navy",
  destructive: "border border-red-300 bg-white text-red-600",
};

const SIZE_CLASSES = {
  default: "min-h-11 px-4 py-2.5 text-sm",
  compact: "px-3 py-1.5 text-xs",
  large: "min-h-11 px-4 py-3.5 text-base",
};

export function Button({
  children,
  variant = "primary",
  size = "default",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: keyof typeof VARIANT_CLASSES;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
} & HTMLMotionProps<"button">) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`rounded-xl font-bold disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
