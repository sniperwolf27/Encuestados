"use client";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl bg-black/15 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`min-h-11 rounded-lg px-5 text-sm font-semibold transition-colors ${
            value === option.value ? "bg-brand-orange text-white" : "text-white/60"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
