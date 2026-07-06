import { User } from "lucide-react";

export function Avatar({
  imageId,
  label,
  size = 56,
}: {
  imageId?: string;
  label?: string;
  size?: number;
}) {
  if (imageId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/images/${imageId}`}
        alt={label ?? "Foto de perfil"}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-white/15 text-white/70"
      style={{ width: size, height: size }}
      aria-label="Foto de perfil"
    >
      <User size={Math.round(size * 0.45)} />
    </div>
  );
}
