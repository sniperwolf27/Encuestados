import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export function ListRow({
  icon,
  iconBg,
  title,
  subtitle,
  showChevron = false,
  variant = "light",
}: {
  icon?: ReactNode;
  iconBg?: string;
  title: string;
  subtitle?: string;
  showChevron?: boolean;
  variant?: "light" | "dark";
}) {
  const textColor = variant === "dark" ? "text-white" : "text-brand-navy";
  const subColor = variant === "dark" ? "text-white/50" : "text-system-secondary";
  const chevronColor = variant === "dark" ? "text-white/30" : "text-gray-300";

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {icon && (
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: iconBg ?? "#f26522" }}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className={`text-[15px] font-semibold ${textColor}`}>{title}</div>
        {subtitle && <div className={`text-xs ${subColor}`}>{subtitle}</div>}
      </div>
      {showChevron && <ChevronRight size={18} className={chevronColor} />}
    </div>
  );
}
